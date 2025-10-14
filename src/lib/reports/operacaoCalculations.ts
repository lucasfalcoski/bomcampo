import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./types";

export interface GeadaCalorRow {
  data: string;
  tipo_evento: 'geada' | 'calor';
  temp_min_c?: number;
  temp_max_c?: number;
  vento_kmh?: number;
  talhao: string;
  acao_tomada: boolean;
  tipo_acao?: string;
}

export interface PerformanceCulturaRow {
  cultura: string;
  plantios_ativos: number;
  area_ha: number;
  estagio_dominante: string;
  custo_real_ha: number;
  custo_estimado_ha: number;
}

export interface FenologiaRow {
  semana: string;
  estagio: string;
  acoes_recomendadas: string[];
  status: 'concluido' | 'em_andamento' | 'planejado';
}

export interface RiscoFitossanitarioRow {
  data: string;
  nivel_risco: 'baixo' | 'medio' | 'alto';
  temperatura_c: number;
  umidade_pct: number;
  chuva_mm: number;
  motivo: string;
}

export interface PlanejadoExecutadoRow {
  tipo: string;
  planejadas: number;
  realizadas: number;
  atrasadas: number;
  percentual: number;
  lead_time_dias: number;
}

export interface HeatmapCell {
  talhao: string;
  semana: string;
  atividades: number;
}

export async function fetchGeadaCalor(filters: ReportFilters): Promise<GeadaCalorRow[]> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  let query = supabase
    .from('activities')
    .select(`
      data,
      weather_snapshot,
      plot_id,
      tipo,
      realizado,
      plots!inner(nome, farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!)
    .not('weather_snapshot', 'is', null);

  if (plot_id) {
    query = query.eq('plot_id', plot_id);
  }

  const { data: activities } = await query;

  const rows: GeadaCalorRow[] = [];

  (activities || []).forEach(act => {
    const snapshot = act.weather_snapshot as any;
    if (!snapshot) return;

    const hasFrost = snapshot.frost_risk || (snapshot.temp_min_c && snapshot.temp_min_c < 2);
    const hasHeat = snapshot.heat_stress || (snapshot.temp_max_c && snapshot.temp_max_c > 34);

    if (hasFrost || hasHeat) {
      rows.push({
        data: act.data,
        tipo_evento: hasFrost ? 'geada' : 'calor',
        temp_min_c: snapshot.temp_min_c,
        temp_max_c: snapshot.temp_max_c,
        vento_kmh: snapshot.vento_kmh || snapshot.wind_kmh,
        talhao: (act.plots as any).nome,
        acao_tomada: act.realizado && ['irrigacao', 'protecao_termica'].includes(act.tipo),
        tipo_acao: act.realizado ? act.tipo : undefined,
      });
    }
  });

  return rows.sort((a, b) => b.data.localeCompare(a.data));
}

export async function fetchPerformanceCultura(filters: ReportFilters): Promise<PerformanceCulturaRow[]> {
  const { farm_id, data_inicio, data_fim } = filters;

  // Buscar plantios ativos
  const { data: plantings } = await supabase
    .from('plantings')
    .select(`
      id,
      plot_id,
      crop_id,
      stage,
      status,
      plots!inner(nome, area_ha, farm_id),
      crops!inner(nome)
    `)
    .eq('plots.farm_id', farm_id)
    .in('status', ['planejado', 'em_andamento']);

  // Buscar custos de atividades por planting
  const { data: activities } = await supabase
    .from('activities')
    .select(`
      planting_id,
      custo_estimado,
      realizado,
      plot_id,
      plots!inner(farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .not('planting_id', 'is', null);

  // Buscar transações vinculadas
  const { data: transactions } = await supabase
    .from('transactions')
    .select('activity_id, valor_brl')
    .eq('tipo', 'custo')
    .not('activity_id', 'is', null);

  const txMap = new Map<string, number>();
  (transactions || []).forEach(tx => {
    if (tx.activity_id) {
      txMap.set(tx.activity_id, (txMap.get(tx.activity_id) || 0) + Number(tx.valor_brl));
    }
  });

  const culturaMap = new Map<string, {
    plantios: number;
    area: number;
    estagios: string[];
    custo_real: number;
    custo_est: number;
  }>();

  (plantings || []).forEach(p => {
    const cultura = (p.crops as any).nome;
    const area = Number((p.plots as any).area_ha || 0);
    
    const current = culturaMap.get(cultura) || {
      plantios: 0,
      area: 0,
      estagios: [],
      custo_real: 0,
      custo_est: 0,
    };

    current.plantios += 1;
    current.area += area;
    if (p.stage) current.estagios.push(p.stage);

    culturaMap.set(cultura, current);
  });

  (activities || []).forEach(act => {
    if (!act.planting_id) return;
    
    const planting = plantings?.find(p => p.id === act.planting_id);
    if (!planting) return;

    const cultura = (planting.crops as any).nome;
    const current = culturaMap.get(cultura);
    if (!current) return;

    if (txMap.has(act.planting_id)) {
      current.custo_real += txMap.get(act.planting_id)!;
    } else if (!act.realizado) {
      current.custo_est += Number(act.custo_estimado || 0);
    }
  });

  return Array.from(culturaMap.entries()).map(([cultura, data]) => {
    const estagioMap = new Map<string, number>();
    data.estagios.forEach(e => estagioMap.set(e, (estagioMap.get(e) || 0) + 1));
    const estagio_dominante = Array.from(estagioMap.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'vegetativo';

    return {
      cultura,
      plantios_ativos: data.plantios,
      area_ha: data.area,
      estagio_dominante,
      custo_real_ha: data.area > 0 ? data.custo_real / data.area : 0,
      custo_estimado_ha: data.area > 0 ? data.custo_est / data.area : 0,
    };
  });
}

export async function fetchPlanejadoExecutado(filters: ReportFilters): Promise<PlanejadoExecutadoRow[]> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  let query = supabase
    .from('activities')
    .select(`
      id,
      tipo,
      data,
      realizado,
      plot_id,
      plots!inner(farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  if (plot_id) {
    query = query.eq('plot_id', plot_id);
  }

  const { data: activities } = await query;

  const tipoMap = new Map<string, {
    planejadas: number;
    realizadas: number;
    atrasadas: number;
    lead_times: number[];
  }>();

  const hoje = new Date().toISOString().split('T')[0];

  (activities || []).forEach(act => {
    const current = tipoMap.get(act.tipo) || {
      planejadas: 0,
      realizadas: 0,
      atrasadas: 0,
      lead_times: [],
    };

    current.planejadas += 1;
    
    if (act.realizado) {
      current.realizadas += 1;
      // Simular lead time (na prática precisaria de data_realizacao)
      current.lead_times.push(1);
    } else if (act.data < hoje) {
      current.atrasadas += 1;
    }

    tipoMap.set(act.tipo, current);
  });

  return Array.from(tipoMap.entries()).map(([tipo, data]) => ({
    tipo,
    planejadas: data.planejadas,
    realizadas: data.realizadas,
    atrasadas: data.atrasadas,
    percentual: data.planejadas > 0 ? (data.realizadas / data.planejadas) * 100 : 0,
    lead_time_dias: data.lead_times.length > 0
      ? data.lead_times.reduce((a, b) => a + b, 0) / data.lead_times.length
      : 0,
  }));
}

export async function fetchHeatmap(filters: ReportFilters): Promise<HeatmapCell[]> {
  const { farm_id, data_inicio, data_fim } = filters;

  const { data: activities } = await supabase
    .from('activities')
    .select(`
      data,
      plot_id,
      plots!inner(nome, farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  const heatmap = new Map<string, number>();

  (activities || []).forEach(act => {
    const date = new Date(act.data);
    const week = `${date.getFullYear()}-S${Math.ceil(date.getDate() / 7)}`;
    const key = `${(act.plots as any).nome}_${week}`;
    heatmap.set(key, (heatmap.get(key) || 0) + 1);
  });

  return Array.from(heatmap.entries()).map(([key, count]) => {
    const [talhao, semana] = key.split('_');
    return { talhao, semana, atividades: count };
  });
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
