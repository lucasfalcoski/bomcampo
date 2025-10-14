// Tipos para o sistema de relatórios

export interface ReportFilters {
  farm_id: string;
  plot_id?: string;
  planting_id?: string;
  periodo: 'mes' | 'ano' | 'intervalo';
  data_inicio?: string;
  data_fim?: string;
  granularidade?: 'dia' | 'semana' | 'mes';
}

export interface ActivityReportRow {
  id: string;
  data: string;
  talhao: string;
  plot_id: string;
  tipo: string;
  descricao: string;
  estimado: number;
  real: number;
  diferenca: number;
  status: 'planejada' | 'atrasada' | 'realizada' | 'sem_conciliacao';
  has_transaction: boolean;
  activity_id: string;
}

export interface ReportKPIs {
  total_estimado: number;
  total_real: number;
  diferenca: number;
  percentual_execucao: number;
}

export interface TypeReportRow {
  tipo: string;
  quantidade: number;
  estimado: number;
  real: number;
  diferenca: number;
  percentual: number;
}

export interface PlotReportRow {
  talhao: string;
  plot_id: string;
  area_ha: number;
  estimado: number;
  real: number;
  diferenca: number;
  custo_ha_estimado: number;
  custo_ha_real: number;
  percentual: number;
}

export interface TimeSeriesRow {
  periodo: string;
  estimado: number;
  real: number;
}

export interface ConformidadeRow {
  data: string;
  talhao: string;
  tipo: string;
  conforme: boolean | null;
  motivo: string;
  weather_snapshot?: any;
}

export interface InsumoRow {
  insumo: string;
  unidade: string;
  quantidade: number;
  custo_estimado: number;
  atividades_count: number;
}
