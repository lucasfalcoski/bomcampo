import type { WeatherData, WeatherAggregates, WeatherIndices } from './agro/types';

interface WeatherPrefs {
  spray_wind_max_kmh: number;
  spray_rain_max_mm: number;
  spray_temp_max_c: number;
  spray_rh_min_pct: number;
  frost_min_temp_c: number;
  heat_stress_max_c: number;
}

// Cache simples (30 min por coordenada)
const cache = new Map<string, { data: WeatherData; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

/**
 * Calcula VPD (Vapor Pressure Deficit) em kPa
 */
function calcularVPD(tempC: number, rhPct: number): number {
  // es = pressão de saturação (kPa)
  const es = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  // ea = pressão real de vapor
  const ea = es * (rhPct / 100);
  // VPD = deficit
  return Math.max(0, es - ea);
}

/**
 * Aproxima temperatura de bulbo úmido usando fórmula de Stull
 */
function calcularTbu(tempC: number, rhPct: number): number {
  const rh = rhPct / 100;
  return tempC * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
         Math.atan(tempC + rh) -
         Math.atan(rh - 1.676331) +
         0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) -
         4.686035;
}

/**
 * Calcula Delta-T (Tbs - Tbu) para spray
 */
function calcularDeltaT(tempC: number, rhPct: number): number {
  const tbu = calcularTbu(tempC, rhPct);
  return tempC - tbu;
}

/**
 * Busca e agrega dados climáticos do Open-Meteo
 */
export async function fetchWeatherData(
  latitude: number,
  longitude: number,
  weatherPrefs: WeatherPrefs
): Promise<WeatherData> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  
  // Verificar cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // Buscar dados hourly e daily do Open-Meteo
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${latitude}&longitude=${longitude}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_gusts_10m,uv_index` +
    `&daily=temperature_2m_max,temperature_2m_min` +
    `&timezone=America/Sao_Paulo` +
    `&forecast_days=2`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar clima: ${response.statusText}`);
  }

  const raw = await response.json();
  const hourly = raw.hourly;
  const daily = raw.daily;

  // Hora atual (índice 0)
  const now = 0;

  // Agregações
  const aggregates: WeatherAggregates = {
    // Próxima 1h (média índices 0-1)
    next1h_wind_avg_kmh: hourly.wind_speed_10m[now],
    next1h_wind_gust_kmh: hourly.wind_gusts_10m[now],

    // Próximas 6h (soma de chuva nos índices 0-5)
    next6h_rain_mm: hourly.precipitation.slice(now, now + 6).reduce((a: number, b: number) => a + b, 0),

    // Próximas 24h (soma de chuva nos índices 0-23)
    next24h_rain_mm: hourly.precipitation.slice(now, now + 24).reduce((a: number, b: number) => a + b, 0),

    // Últimas 24h (simulação: pode usar dados passados se disponível, aqui zero)
    last24h_rain_mm: 0,

    // Min/Max próximas 24h
    next24h_temp_min_c: daily.temperature_2m_min[0],
    next24h_temp_max_c: daily.temperature_2m_max[0],

    // Últimas 12h (simulação: média das 12h anteriores, aqui usando atual)
    last12h_rh_avg_pct: hourly.relative_humidity_2m[now],
    last12h_temp_avg_c: hourly.temperature_2m[now],

    // Atual
    current_temp_c: hourly.temperature_2m[now],
    current_rh_pct: hourly.relative_humidity_2m[now],

    // UV máximo próximas 24h
    uv_index_max_next24h: Math.max(...hourly.uv_index.slice(now, now + 24))
  };

  // Índices derivados
  const last12h_vpd_avg_kpa = calcularVPD(aggregates.last12h_temp_avg_c, aggregates.last12h_rh_avg_pct);
  
  // VPD médio próximas 6h
  const temps6h = hourly.temperature_2m.slice(now, now + 6);
  const rhs6h = hourly.relative_humidity_2m.slice(now, now + 6);
  const vpds6h = temps6h.map((t: number, i: number) => calcularVPD(t, rhs6h[i]));
  const next6h_vpd_avg_kpa = vpds6h.reduce((a: number, b: number) => a + b, 0) / vpds6h.length;

  // Delta-T
  const delta_t_now = calcularDeltaT(aggregates.current_temp_c, aggregates.current_rh_pct);
  const deltaTs6h = temps6h.map((t: number, i: number) => calcularDeltaT(t, rhs6h[i]));
  const delta_t_next6h_avg = deltaTs6h.reduce((a: number, b: number) => a + b, 0) / deltaTs6h.length;

  // Janela seca
  const dry_window_ok = 
    aggregates.next6h_rain_mm <= weatherPrefs.spray_rain_max_mm &&
    aggregates.next1h_wind_avg_kmh < weatherPrefs.spray_wind_max_kmh &&
    aggregates.current_temp_c <= weatherPrefs.spray_temp_max_c &&
    aggregates.current_rh_pct >= weatherPrefs.spray_rh_min_pct;

  // Risco de geada
  const frost_risk = 
    aggregates.next24h_temp_min_c <= weatherPrefs.frost_min_temp_c &&
    aggregates.next1h_wind_avg_kmh < 8;

  // Estresse térmico
  const heat_stress = aggregates.next24h_temp_max_c >= weatherPrefs.heat_stress_max_c;

  const indices: WeatherIndices = {
    last12h_vpd_avg_kpa,
    next6h_vpd_avg_kpa,
    delta_t_now,
    delta_t_next6h_avg,
    dry_window_ok,
    frost_risk,
    heat_stress
  };

  const weatherData: WeatherData = { aggregates, indices, raw };

  // Armazenar no cache
  cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

  return weatherData;
}
