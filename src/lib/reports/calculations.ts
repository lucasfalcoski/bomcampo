import { supabase } from "@/integrations/supabase/client";
import { 
  ActivityReportRow, 
  ReportKPIs, 
  TypeReportRow, 
  PlotReportRow,
  TimeSeriesRow,
  ConformidadeRow,
  InsumoRow,
  ReportFilters 
} from "./types";

export async function fetchActivitiesReport(filters: ReportFilters): Promise<{
  rows: ActivityReportRow[];
  kpis: ReportKPIs;
}> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  // Base activities query
  let activitiesQuery = supabase
    .from('activities')
    .select(`
      id,
      data,
      tipo,
      descricao,
      custo_estimado,
      realizado,
      plot_id,
      plots!inner(nome, farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  if (plot_id) {
    activitiesQuery = activitiesQuery.eq('plot_id', plot_id);
  }

  const { data: activities, error: actError } = await activitiesQuery;
  if (actError) throw actError;

  // Fetch transactions with activity_id
  let txQuery = supabase
    .from('transactions')
    .select(`
      id,
      activity_id,
      valor_brl,
      data,
      plot_id,
      plots(farm_id)
    `)
    .eq('tipo', 'custo')
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  const { data: transactions, error: txError } = await txQuery;
  if (txError) throw txError;

  // Build map: activity_id => total real
  const realMap = new Map<string, number>();
  transactions?.forEach(tx => {
    if (tx.activity_id) {
      realMap.set(tx.activity_id, (realMap.get(tx.activity_id) || 0) + Number(tx.valor_brl));
    }
  });

  const today = new Date().toISOString().split('T')[0];
  
  const rows: ActivityReportRow[] = (activities || []).map(act => {
    const real = realMap.get(act.id) || 0;
    const estimado = Number(act.custo_estimado || 0);
    const has_transaction = realMap.has(act.id);
    
    let status: ActivityReportRow['status'] = 'planejada';
    if (act.realizado) {
      status = has_transaction ? 'realizada' : 'sem_conciliacao';
    } else if (act.data < today) {
      status = 'atrasada';
    }

    return {
      id: act.id,
      data: act.data,
      talhao: (act.plots as any).nome,
      plot_id: act.plot_id,
      tipo: act.tipo,
      descricao: act.descricao || '',
      estimado,
      real,
      diferenca: real - estimado,
      status,
      has_transaction,
      activity_id: act.id,
    };
  });

  // KPIs
  const total_estimado = rows
    .filter(r => !r.has_transaction)
    .reduce((sum, r) => sum + r.estimado, 0);
  
  const total_real = rows.reduce((sum, r) => sum + r.real, 0);
  const diferenca = total_real - total_estimado;
  const percentual_execucao = total_estimado > 0 
    ? (total_real / total_estimado) * 100 
    : 0;

  return {
    rows,
    kpis: { total_estimado, total_real, diferenca, percentual_execucao }
  };
}

export async function fetchTypeReport(filters: ReportFilters): Promise<TypeReportRow[]> {
  const { rows } = await fetchActivitiesReport(filters);
  
  const typeMap = new Map<string, { qty: number; est: number; real: number }>();
  
  rows.forEach(r => {
    const current = typeMap.get(r.tipo) || { qty: 0, est: 0, real: 0 };
    current.qty += 1;
    if (!r.has_transaction) current.est += r.estimado;
    current.real += r.real;
    typeMap.set(r.tipo, current);
  });

  return Array.from(typeMap.entries()).map(([tipo, data]) => ({
    tipo,
    quantidade: data.qty,
    estimado: data.est,
    real: data.real,
    diferenca: data.real - data.est,
    percentual: data.est > 0 ? (data.real / data.est) * 100 : 0,
  }));
}

export async function fetchPlotReport(filters: ReportFilters): Promise<PlotReportRow[]> {
  const { rows } = await fetchActivitiesReport(filters);
  
  // Get plot areas
  const { data: plots } = await supabase
    .from('plots')
    .select('id, nome, area_ha')
    .eq('farm_id', filters.farm_id);

  const plotMap = new Map(plots?.map(p => [p.id, { nome: p.nome, area_ha: Number(p.area_ha || 0) }]));
  const plotData = new Map<string, { est: number; real: number }>();

  rows.forEach(r => {
    const current = plotData.get(r.plot_id) || { est: 0, real: 0 };
    if (!r.has_transaction) current.est += r.estimado;
    current.real += r.real;
    plotData.set(r.plot_id, current);
  });

  return Array.from(plotData.entries()).map(([plot_id, data]) => {
    const plotInfo = plotMap.get(plot_id) || { nome: 'Desconhecido', area_ha: 0 };
    const area_ha = plotInfo.area_ha || 1;
    
    return {
      talhao: plotInfo.nome,
      plot_id,
      area_ha,
      estimado: data.est,
      real: data.real,
      diferenca: data.real - data.est,
      custo_ha_estimado: data.est / area_ha,
      custo_ha_real: data.real / area_ha,
      percentual: data.est > 0 ? (data.real / data.est) * 100 : 0,
    };
  });
}

export async function fetchTimeSeriesReport(filters: ReportFilters): Promise<TimeSeriesRow[]> {
  const { rows } = await fetchActivitiesReport(filters);
  const granularidade = filters.granularidade || 'mes';
  
  const seriesMap = new Map<string, { est: number; real: number }>();
  
  rows.forEach(r => {
    const date = new Date(r.data);
    let key: string;
    
    if (granularidade === 'mes') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (granularidade === 'semana') {
      const week = Math.ceil(date.getDate() / 7);
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-S${week}`;
    } else {
      key = r.data;
    }
    
    const current = seriesMap.get(key) || { est: 0, real: 0 };
    if (!r.has_transaction) current.est += r.estimado;
    current.real += r.real;
    seriesMap.set(key, current);
  });

  return Array.from(seriesMap.entries())
    .map(([periodo, data]) => ({
      periodo,
      estimado: data.est,
      real: data.real,
    }))
    .sort((a, b) => a.periodo.localeCompare(b.periodo));
}

export async function fetchConformidadeReport(filters: ReportFilters): Promise<{
  rows: ConformidadeRow[];
  percentual_conforme: number;
}> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  let query = supabase
    .from('activities')
    .select(`
      id,
      data,
      tipo,
      clima_conforme,
      weather_snapshot,
      realizado,
      plot_id,
      plots!inner(nome, farm_id)
    `)
    .eq('plots.farm_id', farm_id)
    .eq('realizado', true)
    .like('tipo', 'pulverizacao%')
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  if (plot_id) {
    query = query.eq('plot_id', plot_id);
  }

  const { data: activities, error } = await query;
  if (error) throw error;

  const rows: ConformidadeRow[] = (activities || []).map(act => {
    let conforme = act.clima_conforme;
    let motivo = '';

    if (conforme === null && act.weather_snapshot) {
      // Inferir conformidade do snapshot
      const snap = act.weather_snapshot as any;
      const problemas: string[] = [];
      
      if (snap.vento_kmh > 15) problemas.push('vento alto');
      if (snap.chuva_6h_mm > 1) problemas.push('chuva prevista');
      if (snap.deltaT < 2 || snap.deltaT > 10) problemas.push('deltaT fora da faixa');
      
      conforme = problemas.length === 0;
      motivo = problemas.join(', ');
    }

    return {
      data: act.data,
      talhao: (act.plots as any).nome,
      tipo: act.tipo,
      conforme,
      motivo,
      weather_snapshot: act.weather_snapshot,
    };
  });

  const conformes = rows.filter(r => r.conforme === true).length;
  const percentual_conforme = rows.length > 0 ? (conformes / rows.length) * 100 : 0;

  return { rows, percentual_conforme };
}

export async function fetchInsumosReport(filters: ReportFilters): Promise<InsumoRow[]> {
  const { farm_id, plot_id, data_inicio, data_fim } = filters;

  // Get activities in range
  let actQuery = supabase
    .from('activities')
    .select('id, plot_id, plots!inner(farm_id)')
    .eq('plots.farm_id', farm_id)
    .gte('data', data_inicio!)
    .lte('data', data_fim!);

  if (plot_id) actQuery = actQuery.eq('plot_id', plot_id);

  const { data: activities } = await actQuery;
  const activityIds = activities?.map(a => a.id) || [];

  if (activityIds.length === 0) return [];

  // Get activity items
  const { data: items } = await supabase
    .from('activity_items')
    .select('*')
    .in('activity_id', activityIds);

  const insumoMap = new Map<string, { qty: number; custo: number; count: number; unidade: string }>();

  (items || []).forEach(item => {
    const key = item.insumo;
    const current = insumoMap.get(key) || { 
      qty: 0, 
      custo: 0, 
      count: 0, 
      unidade: item.unidade || '' 
    };
    current.qty += Number(item.quantidade || 0);
    current.custo += Number(item.custo_estimado_item || 0);
    current.count += 1;
    insumoMap.set(key, current);
  });

  return Array.from(insumoMap.entries()).map(([insumo, data]) => ({
    insumo,
    unidade: data.unidade,
    quantidade: data.qty,
    custo_estimado: data.custo,
    atividades_count: data.count,
  }));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
