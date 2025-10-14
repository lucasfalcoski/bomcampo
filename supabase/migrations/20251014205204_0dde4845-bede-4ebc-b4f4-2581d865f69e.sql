-- ========================================
-- A) CRIAR TABELA crop_profiles
-- ========================================
CREATE TABLE public.crop_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_code TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  default_rules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.crop_profiles ENABLE ROW LEVEL SECURITY;

-- RLS: leitura pública
CREATE POLICY "Anyone can view crop profiles"
ON public.crop_profiles
FOR SELECT
USING (true);

-- ========================================
-- B) POPULAR crop_profiles COM SEEDS
-- ========================================
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules) VALUES
('cafe_arabica', 'Café arábica', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 85, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 32},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('soja', 'Soja', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 80, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('milho', 'Milho', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 80, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('trigo', 'Trigo', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 80, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('uva', 'Uva', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 85, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 3},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('citros', 'Citros', '{
  "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 85, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 3},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}'),
('tomate', 'Tomate', '{
  "spray": {"wind_max_kmh": 12, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
  "disease": {"rh_pct": 85, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
  "frost": {"min_temp_c": 2},
  "heat": {"max_temp_c": 34},
  "by_stage": {
    "semeadura": {}, "emergencia": {}, "vegetativo": {}, "floracao": {}, "frutificacao": {}, "maturacao": {}, "colheita": {}
  }
}');

-- ========================================
-- C) ADICIONAR COLUNAS EM plantings
-- ========================================
ALTER TABLE public.plantings 
ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'vegetativo' 
  CHECK (stage IN ('semeadura','emergencia','vegetativo','floracao','frutificacao','maturacao','colheita')),
ADD COLUMN IF NOT EXISTS stage_override BOOLEAN DEFAULT false;

-- ========================================
-- D) AMPLIAR weather_prefs
-- ========================================
ALTER TABLE public.weather_prefs
ADD COLUMN IF NOT EXISTS spray_wind_max_kmh NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS spray_dry_window_h INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS spray_rain_max_mm NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS spray_temp_max_c NUMERIC DEFAULT 30,
ADD COLUMN IF NOT EXISTS spray_rh_min_pct NUMERIC DEFAULT 45,
ADD COLUMN IF NOT EXISTS disease_rh_pct NUMERIC DEFAULT 80,
ADD COLUMN IF NOT EXISTS disease_temp_min_c NUMERIC DEFAULT 15,
ADD COLUMN IF NOT EXISTS disease_temp_max_c NUMERIC DEFAULT 26,
ADD COLUMN IF NOT EXISTS disease_rain_24h_mm NUMERIC DEFAULT 5,
ADD COLUMN IF NOT EXISTS frost_min_temp_c NUMERIC DEFAULT 2,
ADD COLUMN IF NOT EXISTS heat_stress_max_c NUMERIC DEFAULT 34;

-- ========================================
-- E) CRIAR TABELA farm_crop_rules
-- ========================================
CREATE TABLE public.farm_crop_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  crop_code TEXT NOT NULL REFERENCES public.crop_profiles(crop_code),
  rules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(farm_id, crop_code)
);

ALTER TABLE public.farm_crop_rules ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT/INSERT/UPDATE apenas se farm pertence ao usuário
CREATE POLICY "Users can view own farm crop rules"
ON public.farm_crop_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_crop_rules.farm_id
    AND farms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert farm crop rules in own farms"
ON public.farm_crop_rules
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_crop_rules.farm_id
    AND farms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own farm crop rules"
ON public.farm_crop_rules
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_crop_rules.farm_id
    AND farms.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own farm crop rules"
ON public.farm_crop_rules
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM farms
    WHERE farms.id = farm_crop_rules.farm_id
    AND farms.user_id = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER update_farm_crop_rules_updated_at
BEFORE UPDATE ON public.farm_crop_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();