import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchWeatherData } from '@/lib/weatherService';
import { resolverEstagio } from '@/lib/agro/stage';
import { gerarRecomendacoes } from '@/lib/agro/recommender';
import { resolverLocalizacao } from '@/lib/location/resolve';
import type { Recommendation, CropRules } from '@/lib/agro/types';

interface UseAgroRecommendationsProps {
  farmId: string | null;
  plotId: string | null;
}

export function useAgroRecommendations({ farmId, plotId }: UseAgroRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId || !plotId) {
      setRecommendations([]);
      return;
    }

    loadRecommendations();
  }, [farmId, plotId]);

  const loadRecommendations = async () => {
    if (!farmId || !plotId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Buscar plot e farm
      const { data: plot, error: plotError } = await supabase
        .from('plots')
        .select('*, farm:farms(*)')
        .eq('id', plotId)
        .single();

      if (plotError) throw plotError;

      // 2. Resolver localização (coordenadas ou município)
      const location = await resolverLocalizacao(plot, plot.farm);
      if (!location) {
        throw new Error('Localização não encontrada. Adicione coordenadas ou município.');
      }

      // 3. Buscar plantio ativo (mais recente que não está colhido)
      const { data: plantings, error: plantingError } = await supabase
        .from('plantings')
        .select('*, crop:crops(*)')
        .eq('plot_id', plotId)
        .neq('status', 'colhido')
        .order('data_plantio', { ascending: false })
        .limit(1);

      if (plantingError) throw plantingError;
      if (!plantings || plantings.length === 0) {
        // Sem plantio ativo, apenas alertas climáticos básicos
        const { data: weatherPrefs } = await supabase
          .from('weather_prefs')
          .select('*')
          .eq('user_id', plot.farm.user_id)
          .single();

        const weather = await fetchWeatherData(
          location.lat,
          location.lon,
          weatherPrefs || {
            spray_wind_max_kmh: 15,
            spray_rain_max_mm: 1,
            spray_temp_max_c: 30,
            spray_rh_min_pct: 45,
            frost_min_temp_c: 2,
            heat_stress_max_c: 34
          }
        );

        // Gerar recomendações genéricas sem cultura
        const genericRules: CropRules = {
          spray: { wind_max_kmh: 15, dry_window_h: 6, rain_max_mm: 1, temp_max_c: 30, rh_min_pct: 45 },
          disease: { rh_pct: 80, temp_min_c: 15, temp_max_c: 26, rain_24h_mm: 5 },
          frost: { min_temp_c: 2 },
          heat: { max_temp_c: 34 },
          by_stage: {}
        };

        const recs = gerarRecomendacoes(
          genericRules,
          null,
          'vegetativo',
          weather,
          weatherPrefs || {
            spray_wind_max_kmh: 15,
            spray_dry_window_h: 6,
            spray_rain_max_mm: 1,
            spray_temp_max_c: 30,
            spray_rh_min_pct: 45,
            disease_rh_pct: 80,
            disease_temp_min_c: 15,
            disease_temp_max_c: 26,
            disease_rain_24h_mm: 5,
            frost_min_temp_c: 2,
            heat_stress_max_c: 34
          }
        );

        setRecommendations(recs);
        setLoading(false);
        return;
      }

      const planting = plantings[0];

      // 4. Buscar crop_profile
      const { data: cropProfile, error: cropProfileError } = await supabase
        .from('crop_profiles')
        .select('*')
        .eq('crop_code', getCropCode(planting.crop.nome))
        .single();

      if (cropProfileError) {
        console.warn('Crop profile não encontrado, usando defaults');
      }

      // 5. Buscar weather_prefs e farm_crop_rules
      const { data: weatherPrefs } = await supabase
        .from('weather_prefs')
        .select('*')
        .eq('user_id', plot.farm.user_id)
        .maybeSingle();

      const { data: farmCropRules } = await supabase
        .from('farm_crop_rules')
        .select('*')
        .eq('farm_id', farmId)
        .eq('crop_code', getCropCode(planting.crop.nome))
        .maybeSingle();

      // 6. Resolver estágio fenológico
      const cropProfileData = cropProfile ? {
        default_rules: cropProfile.default_rules as unknown as CropRules
      } : { default_rules: getDefaultRules() };

      const stage = resolverEstagio(
        planting as any,
        planting.crop as any,
        cropProfileData
      );

      // 7. Buscar dados climáticos usando a localização resolvida
      const weather = await fetchWeatherData(
        location.lat,
        location.lon,
        weatherPrefs || {
          spray_wind_max_kmh: 15,
          spray_rain_max_mm: 1,
          spray_temp_max_c: 30,
          spray_rh_min_pct: 45,
          frost_min_temp_c: 2,
          heat_stress_max_c: 34
        }
      );

      // 8. Gerar recomendações
      const cropRules: CropRules = cropProfile 
        ? (cropProfile.default_rules as unknown as CropRules)
        : getDefaultRules();
      const recs = gerarRecomendacoes(
        cropRules,
        farmCropRules ? (farmCropRules.rules as unknown as Partial<CropRules>) : null,
        stage,
        weather,
        weatherPrefs || {
          spray_wind_max_kmh: 15,
          spray_dry_window_h: 6,
          spray_rain_max_mm: 1,
          spray_temp_max_c: 30,
          spray_rh_min_pct: 45,
          disease_rh_pct: 80,
          disease_temp_min_c: 15,
          disease_temp_max_c: 26,
          disease_rain_24h_mm: 5,
          frost_min_temp_c: 2,
          heat_stress_max_c: 34
        }
      );

      setRecommendations(recs);
    } catch (err: any) {
      console.error('Erro ao carregar recomendações:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { recommendations, loading, error, reload: loadRecommendations };
}

// Helper para mapear nome da cultura para crop_code
function getCropCode(cropName: string): string {
  const map: Record<string, string> = {
    'Café': 'cafe_arabica',
    'Café arábica': 'cafe_arabica',
    'Soja': 'soja',
    'Milho': 'milho',
    'Trigo': 'trigo',
    'Uva': 'uva',
    'Citros': 'citros',
    'Tomate': 'tomate'
  };
  return map[cropName] || 'soja'; // fallback
}

// Regras padrão genéricas
function getDefaultRules(): CropRules {
  return {
    spray: { wind_max_kmh: 15, dry_window_h: 6, rain_max_mm: 1, temp_max_c: 30, rh_min_pct: 45 },
    disease: { rh_pct: 80, temp_min_c: 15, temp_max_c: 26, rain_24h_mm: 5 },
    frost: { min_temp_c: 2 },
    heat: { max_temp_c: 34 },
    by_stage: {}
  };
}
