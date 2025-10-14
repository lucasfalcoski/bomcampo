import type { 
  CropRules, 
  WeatherData, 
  Recommendation, 
  Stage 
} from './types';

interface WeatherPrefs {
  spray_wind_max_kmh: number;
  spray_dry_window_h: number;
  spray_rain_max_mm: number;
  spray_temp_max_c: number;
  spray_rh_min_pct: number;
  disease_rh_pct: number;
  disease_temp_min_c: number;
  disease_temp_max_c: number;
  disease_rain_24h_mm: number;
  frost_min_temp_c: number;
  heat_stress_max_c: number;
}

/**
 * Mescla regras: padrão < override fazenda < override estágio
 */
function mergeRules(
  defaultRules: CropRules,
  farmRules: Partial<CropRules> | null,
  stage: Stage
): CropRules {
  let merged = { ...defaultRules };

  // Aplicar overrides da fazenda
  if (farmRules) {
    if (farmRules.spray) merged.spray = { ...merged.spray, ...farmRules.spray };
    if (farmRules.disease) merged.disease = { ...merged.disease, ...farmRules.disease };
    if (farmRules.frost) merged.frost = { ...merged.frost, ...farmRules.frost };
    if (farmRules.heat) merged.heat = { ...merged.heat, ...farmRules.heat };
  }

  // Aplicar overrides do estágio
  const stageOverride = merged.by_stage[stage];
  if (stageOverride) {
    if (stageOverride.spray) merged.spray = { ...merged.spray, ...stageOverride.spray };
    if (stageOverride.disease) merged.disease = { ...merged.disease, ...stageOverride.disease };
    if (stageOverride.frost) merged.frost = { ...merged.frost, ...stageOverride.frost };
    if (stageOverride.heat) merged.heat = { ...merged.heat, ...stageOverride.heat };
  }

  return merged;
}

/**
 * Gera recomendações agrícolas baseadas em regras e clima
 */
export function gerarRecomendacoes(
  cropRules: CropRules,
  farmRules: Partial<CropRules> | null,
  stage: Stage,
  weather: WeatherData,
  weatherPrefs: WeatherPrefs
): Recommendation[] {
  const rules = mergeRules(cropRules, farmRules, stage);
  const recommendations: Recommendation[] = [];

  const { aggregates, indices } = weather;

  // ==========================================
  // 1) PULVERIZAÇÃO
  // ==========================================
  const sprayReasons: string[] = [];
  let sprayOk = true;

  // Janela seca
  if (!indices.dry_window_ok) {
    sprayOk = false;
    if (aggregates.next6h_rain_mm > rules.spray.rain_max_mm) {
      sprayReasons.push(`Chuva 6h: ${aggregates.next6h_rain_mm.toFixed(1)}mm > ${rules.spray.rain_max_mm}mm`);
    }
    if (aggregates.next1h_wind_avg_kmh >= rules.spray.wind_max_kmh) {
      sprayReasons.push(`Vento: ${aggregates.next1h_wind_avg_kmh.toFixed(1)} >= ${rules.spray.wind_max_kmh} km/h`);
    }
    if (aggregates.current_temp_c > rules.spray.temp_max_c) {
      sprayReasons.push(`Temp: ${aggregates.current_temp_c.toFixed(1)}°C > ${rules.spray.temp_max_c}°C`);
    }
    if (aggregates.current_rh_pct < rules.spray.rh_min_pct) {
      sprayReasons.push(`UR: ${aggregates.current_rh_pct.toFixed(0)}% < ${rules.spray.rh_min_pct}%`);
    }
  }

  // Delta-T (ideal 2-8°C)
  if (indices.delta_t_now < 2 || indices.delta_t_now > 8) {
    sprayOk = false;
    sprayReasons.push(`ΔT: ${indices.delta_t_now.toFixed(1)}°C (ideal 2-8°C)`);
  }

  if (sprayOk) {
    sprayReasons.push(`Vento ${aggregates.next1h_wind_avg_kmh.toFixed(1)} < ${rules.spray.wind_max_kmh} km/h`);
    sprayReasons.push(`Chuva 6h: ${aggregates.next6h_rain_mm.toFixed(1)} < ${rules.spray.rain_max_mm}mm`);
    sprayReasons.push(`ΔT: ${indices.delta_t_now.toFixed(1)}°C OK`);
  }

  recommendations.push({
    tipo: 'pulverizacao',
    status: sprayOk ? 'favoravel' : 'desfavoravel',
    por_que: sprayReasons,
    acao: sprayOk 
      ? `Agendar nas próximas ${weatherPrefs.spray_dry_window_h}h`
      : 'Adiar pulverização, revisar em 3h'
  });

  // ==========================================
  // 2) DOENÇAS
  // ==========================================
  const diseaseReasons: string[] = [];
  let diseaseRisk = false;

  const rhHigh = aggregates.last12h_rh_avg_pct >= rules.disease.rh_pct;
  const tempInRange = 
    aggregates.last12h_temp_avg_c >= rules.disease.temp_min_c &&
    aggregates.last12h_temp_avg_c <= rules.disease.temp_max_c;
  const rainHigh = 
    aggregates.next24h_rain_mm >= rules.disease.rain_24h_mm ||
    aggregates.last24h_rain_mm >= rules.disease.rain_24h_mm;

  if (rhHigh && tempInRange && rainHigh) {
    diseaseRisk = true;
    diseaseReasons.push(`UR: ${aggregates.last12h_rh_avg_pct.toFixed(0)}% >= ${rules.disease.rh_pct}%`);
    diseaseReasons.push(`Temp: ${aggregates.last12h_temp_avg_c.toFixed(1)}°C (faixa ${rules.disease.temp_min_c}-${rules.disease.temp_max_c}°C)`);
    diseaseReasons.push(`Chuva 24h: ${aggregates.next24h_rain_mm.toFixed(1)}mm >= ${rules.disease.rain_24h_mm}mm`);
  } else {
    diseaseReasons.push(`UR: ${aggregates.last12h_rh_avg_pct.toFixed(0)}% < ${rules.disease.rh_pct}%`);
    diseaseReasons.push(`Condições não favorecem doenças`);
  }

  recommendations.push({
    tipo: 'doencas',
    status: diseaseRisk ? 'alto' : 'baixo',
    por_que: diseaseReasons,
    acao: diseaseRisk 
      ? `Monitorar culturas no estágio ${stage}. Considerar fungicida preventivo.`
      : 'Risco baixo. Manter monitoramento.'
  });

  // ==========================================
  // 3) GEADA
  // ==========================================
  if (indices.frost_risk) {
    recommendations.push({
      tipo: 'geada',
      status: 'risco',
      por_que: [
        `Temp mín: ${aggregates.next24h_temp_min_c.toFixed(1)}°C <= ${rules.frost.min_temp_c}°C`,
        `Vento baixo: ${aggregates.next1h_wind_avg_kmh.toFixed(1)} km/h`
      ],
      acao: 'Alerta de geada! Considerar proteção das culturas.'
    });
  }

  // ==========================================
  // 4) CALOR / ESTRESSE TÉRMICO
  // ==========================================
  if (indices.heat_stress) {
    recommendations.push({
      tipo: 'calor',
      status: 'risco',
      por_que: [
        `Temp máx: ${aggregates.next24h_temp_max_c.toFixed(1)}°C >= ${rules.heat.max_temp_c}°C`,
        `VPD médio: ${indices.last12h_vpd_avg_kpa.toFixed(2)} kPa`
      ],
      acao: 'Estresse térmico previsto. Considerar irrigação se VPD > 1.5 kPa.'
    });
  }

  // ==========================================
  // 5) IRRIGAÇÃO (opcional, baseado em VPD)
  // ==========================================
  if (indices.next6h_vpd_avg_kpa >= 1.5 && aggregates.next24h_rain_mm < 2) {
    recommendations.push({
      tipo: 'irrigacao',
      status: 'risco',
      por_que: [
        `VPD 6h: ${indices.next6h_vpd_avg_kpa.toFixed(2)} kPa >= 1.5`,
        `Chuva prevista: ${aggregates.next24h_rain_mm.toFixed(1)}mm < 2mm`
      ],
      acao: 'Déficit hídrico detectado. Planejar irrigação leve.'
    });
  }

  // ==========================================
  // 6) UV (opcional)
  // ==========================================
  if (aggregates.uv_index_max_next24h >= 8) {
    recommendations.push({
      tipo: 'uv',
      status: 'alto',
      por_que: [`Índice UV máximo: ${aggregates.uv_index_max_next24h.toFixed(0)}`],
      acao: 'Proteção solar recomendada para trabalhadores no campo.'
    });
  }

  return recommendations;
}
