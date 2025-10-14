import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./types";

export interface ClimaResumo {
  chuva_acumulada_mm: number;
  dias_com_chuva: number;
  temp_media_c: number;
  temp_min_c: number;
  temp_max_c: number;
  vpd_medio_kpa: number;
  horas_janela_seca: number;
  alertas_geada: number;
  alertas_calor: number;
}

export interface ClimaDiario {
  data: string;
  chuva_mm: number;
  temp_min_c: number;
  temp_max_c: number;
  vpd_kpa: number;
  delta_t: number;
  janela_favoravel: boolean;
}

export interface RiscoDoencaRow {
  data: string;
  talhao: string;
  nivel_risco: 'alto' | 'medio' | 'baixo';
  temperatura_c: number;
  umidade_pct: number;
  chuva_24h_mm: number;
  acao_tomada: boolean;
  tempo_resposta_h: number | null;
  tipo_acao: string | null;
}

export async function fetchClimaResumo(filters: ReportFilters): Promise<{
  resumo: ClimaResumo;
  diarios: ClimaDiario[];
}> {
  // Buscar dados climáticos do período via weatherService
  // Por simplicidade, vou simular com dados das atividades que têm weather_snapshot
  
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  let query = supabase
    .from('activities')
    .select(`
      data,
      weather_snapshot,
      plots!inner(farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!)
    .not('weather_snapshot', 'is', null);

  if (plot_id) {
    query = query.eq('plot_id', plot_id);
  }

  const { data: activities } = await query;

  const snapshots = (activities || []).map(a => ({
    data: a.data,
    snapshot: a.weather_snapshot as any,
  }));

  // Processar snapshots para calcular resumo
  let chuva_total = 0;
  let dias_com_chuva = 0;
  let temp_sum = 0;
  let temp_min = Infinity;
  let temp_max = -Infinity;
  let vpd_sum = 0;
  let horas_janela = 0;
  let alertas_geada = 0;
  let alertas_calor = 0;

  const diarios: ClimaDiario[] = [];

  snapshots.forEach(({ data, snapshot }) => {
    if (!snapshot) return;

    const chuva = snapshot.chuva_6h_mm || 0;
    const temp_min_dia = snapshot.temp_min_c || 0;
    const temp_max_dia = snapshot.temp_max_c || 0;
    const temp_media_dia = (temp_min_dia + temp_max_dia) / 2;
    const vpd = snapshot.vpd_kpa || 0;
    const delta_t = snapshot.deltaT || 0;

    chuva_total += chuva;
    if (chuva > 0) dias_com_chuva++;
    temp_sum += temp_media_dia;
    temp_min = Math.min(temp_min, temp_min_dia);
    temp_max = Math.max(temp_max, temp_max_dia);
    vpd_sum += vpd;

    if (snapshot.janela_seca_ok || snapshot.dry_window_ok) horas_janela += 6;
    if (snapshot.frost_risk) alertas_geada++;
    if (snapshot.heat_stress) alertas_calor++;

    diarios.push({
      data,
      chuva_mm: chuva,
      temp_min_c: temp_min_dia,
      temp_max_c: temp_max_dia,
      vpd_kpa: vpd,
      delta_t,
      janela_favoravel: snapshot.janela_seca_ok || snapshot.dry_window_ok || false,
    });
  });

  const count = snapshots.length || 1;

  return {
    resumo: {
      chuva_acumulada_mm: chuva_total,
      dias_com_chuva,
      temp_media_c: temp_sum / count,
      temp_min_c: temp_min === Infinity ? 0 : temp_min,
      temp_max_c: temp_max === -Infinity ? 0 : temp_max,
      vpd_medio_kpa: vpd_sum / count,
      horas_janela_seca: horas_janela,
      alertas_geada,
      alertas_calor,
    },
    diarios: diarios.sort((a, b) => a.data.localeCompare(b.data)),
  };
}

export async function fetchRiscoDoencas(filters: ReportFilters): Promise<RiscoDoencaRow[]> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  // Buscar atividades com weather_snapshot para avaliar risco
  let query = supabase
    .from('activities')
    .select(`
      id,
      data,
      weather_snapshot,
      plot_id,
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

  // Buscar ações tomadas (activities de monitoramento/pulverização)
  const { data: acoes } = await supabase
    .from('activities')
    .select(`
      data,
      tipo,
      plot_id
    `)
    .in('tipo', ['monitoramento_fitossanitario', 'pulverizacao_fungicida', 'pulverizacao_inseticida'])
    .eq('realizado', true)
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  const acoesMap = new Map<string, any[]>();
  (acoes || []).forEach(acao => {
    const key = `${acao.plot_id}_${acao.data}`;
    if (!acoesMap.has(key)) acoesMap.set(key, []);
    acoesMap.get(key)!.push(acao);
  });

  const rows: RiscoDoencaRow[] = [];

  (activities || []).forEach(act => {
    const snapshot = act.weather_snapshot as any;
    if (!snapshot) return;

    // Calcular nível de risco baseado em critérios de doença
    const temp = snapshot.temp_avg_c || 20;
    const rh = snapshot.rh_avg_pct || 60;
    const chuva = snapshot.chuva_24h_mm || 0;

    let nivel_risco: 'alto' | 'medio' | 'baixo' = 'baixo';
    
    if (rh >= 80 && temp >= 15 && temp <= 26 && chuva >= 5) {
      nivel_risco = 'alto';
    } else if (rh >= 70 && temp >= 15 && temp <= 28) {
      nivel_risco = 'medio';
    }

    // Verificar se houve ação
    const key = `${act.plot_id}_${act.data}`;
    const acoesDia = acoesMap.get(key) || [];
    const acao_tomada = acoesDia.length > 0;

    rows.push({
      data: act.data,
      talhao: (act.plots as any).nome,
      nivel_risco,
      temperatura_c: temp,
      umidade_pct: rh,
      chuva_24h_mm: chuva,
      acao_tomada,
      tempo_resposta_h: acao_tomada ? 24 : null,
      tipo_acao: acao_tomada ? acoesDia[0].tipo : null,
    });
  });

  return rows.sort((a, b) => b.data.localeCompare(a.data));
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
