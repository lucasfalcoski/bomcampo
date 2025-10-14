// Tipos para o sistema de recomendações agrícolas

export type Stage = 
  | 'semeadura' 
  | 'emergencia' 
  | 'vegetativo' 
  | 'floracao' 
  | 'frutificacao' 
  | 'maturacao' 
  | 'colheita';

export interface SprayRules {
  wind_max_kmh: number;
  dry_window_h: number;
  rain_max_mm: number;
  temp_max_c: number;
  rh_min_pct: number;
}

export interface DiseaseRules {
  rh_pct: number;
  temp_min_c: number;
  temp_max_c: number;
  rain_24h_mm: number;
}

export interface FrostRules {
  min_temp_c: number;
}

export interface HeatRules {
  max_temp_c: number;
}

export interface CropRules {
  spray: SprayRules;
  disease: DiseaseRules;
  frost: FrostRules;
  heat: HeatRules;
  by_stage: Partial<Record<Stage, Partial<CropRules>>>;
}

export interface WeatherAggregates {
  next1h_wind_avg_kmh: number;
  next1h_wind_gust_kmh: number;
  next6h_rain_mm: number;
  next24h_rain_mm: number;
  last24h_rain_mm: number;
  next24h_temp_min_c: number;
  next24h_temp_max_c: number;
  last12h_rh_avg_pct: number;
  last12h_temp_avg_c: number;
  current_temp_c: number;
  current_rh_pct: number;
  uv_index_max_next24h: number;
}

export interface WeatherIndices {
  last12h_vpd_avg_kpa: number;
  next6h_vpd_avg_kpa: number;
  delta_t_now: number;
  delta_t_next6h_avg: number;
  dry_window_ok: boolean;
  frost_risk: boolean;
  heat_stress: boolean;
}

export interface WeatherData {
  aggregates: WeatherAggregates;
  indices: WeatherIndices;
  raw: any;
}

export type RecommendationType = 
  | 'pulverizacao' 
  | 'doencas' 
  | 'geada' 
  | 'calor' 
  | 'irrigacao' 
  | 'uv';

export type RecommendationStatus = 
  | 'favoravel' 
  | 'desfavoravel' 
  | 'alto' 
  | 'baixo' 
  | 'risco';

export interface Recommendation {
  tipo: RecommendationType;
  status: RecommendationStatus;
  por_que: string[];
  acao: string;
}
