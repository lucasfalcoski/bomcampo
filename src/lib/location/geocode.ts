// Geocoding using Open-Meteo Geocoding API
// Cache results for 24h to avoid repeated requests

interface GeocodingResult {
  lat: number;
  lon: number;
  name: string;
  country: string;
}

const GEOCODING_CACHE_KEY = 'bc_geocoding_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: GeocodingResult;
  timestamp: number;
}

interface GeocodingCache {
  [key: string]: CacheEntry;
}

function getCache(): GeocodingCache {
  try {
    const cached = localStorage.getItem(GEOCODING_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setCache(cache: GeocodingCache) {
  try {
    localStorage.setItem(GEOCODING_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to cache geocoding result:', e);
  }
}

export async function geoForward(cityName: string): Promise<GeocodingResult | null> {
  if (!cityName?.trim()) return null;

  const cacheKey = cityName.toLowerCase().trim();
  const cache = getCache();
  
  // Check cache
  const cached = cache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  // Fetch from Open-Meteo Geocoding API
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=pt&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result: GeocodingResult = {
      lat: data.results[0].latitude,
      lon: data.results[0].longitude,
      name: data.results[0].name,
      country: data.results[0].country || 'Brasil'
    };

    // Update cache
    cache[cacheKey] = {
      data: result,
      timestamp: Date.now()
    };
    setCache(cache);

    return result;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}
