-- Add new crop profiles to expand Bom Campo catalog
-- Using INSERT ... ON CONFLICT to update existing or insert new

-- Helper function to merge JSON objects (if not exists)
CREATE OR REPLACE FUNCTION jsonb_merge(a jsonb, b jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN a || b;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Base default_rules template
DO $$
DECLARE
  base_rules jsonb := '{
    "spray": {"wind_max_kmh": 15, "dry_window_h": 6, "rain_max_mm": 1, "temp_max_c": 30, "rh_min_pct": 45},
    "disease": {"rh_pct": 80, "temp_min_c": 15, "temp_max_c": 26, "rain_24h_mm": 5},
    "frost": {"min_temp_c": 2},
    "heat": {"max_temp_c": 34},
    "by_stage": {
      "semeadura": {},
      "emergencia": {},
      "vegetativo": {},
      "floracao": {},
      "frutificacao": {},
      "maturacao": {},
      "colheita": {}
    }
  }'::jsonb;
BEGIN

-- 1) GRÃOS ANUAIS
-- Arroz
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('arroz', 'Arroz', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 35}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Feijão
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('feijao', 'Feijão', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 35}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Sorgo
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('sorgo', 'Sorgo', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 36}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Girassol
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('girassol', 'Girassol', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 36}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Cevada
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('cevada', 'Cevada', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 35}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Aveia
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('aveia', 'Aveia', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 35}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Algodão (similar a grãos mas com pequenos ajustes)
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('algodao', 'Algodão', base_rules || '{"disease": {"rain_24h_mm": 4}, "heat": {"max_temp_c": 36}}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 2) RAÍZES/TUBÉRCULOS/BULBOS
-- Mandioca
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('mandioca', 'Mandioca', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 34}
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Batata
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('batata', 'Batata', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 32},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {"spray": {"temp_max_c": 28}},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Cebola
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('cebola', 'Cebola', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 32},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {"spray": {"temp_max_c": 28}},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Alho
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('alho', 'Alho', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 32},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {"spray": {"temp_max_c": 28}},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 3) HORTALIÇAS FOLHOSAS E FRUTOS DELICADOS
-- Alface
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('alface', 'Alface', base_rules || '{
  "spray": {"wind_max_kmh": 12, "rh_min_pct": 50},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 30}
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Pimentão
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('pimentao', 'Pimentão', base_rules || '{
  "spray": {"wind_max_kmh": 12, "rh_min_pct": 50},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 30},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {"spray": {"dry_window_h": 8, "rain_max_mm": 0.5}},
    "frutificacao": {"spray": {"dry_window_h": 8, "rain_max_mm": 0.5}},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Morango
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('morango', 'Morango', base_rules || '{
  "spray": {"wind_max_kmh": 12, "rh_min_pct": 50},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 29},
  "frost": {"min_temp_c": 3},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {"spray": {"dry_window_h": 8, "rain_max_mm": 0.5}},
    "frutificacao": {"spray": {"dry_window_h": 8, "rain_max_mm": 0.5}},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 4) PERENES FRUTÍFERAS
-- Banana
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('banana', 'Banana', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 33},
  "frost": {"min_temp_c": 4},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {"spray": {"temp_max_c": 28}},
    "frutificacao": {"spray": {"dry_window_h": 8}},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Manga
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('manga', 'Manga', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 34},
  "frost": {"min_temp_c": 3},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {"spray": {"temp_max_c": 28}},
    "frutificacao": {"spray": {"dry_window_h": 8}},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- Abacate
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('abacate', 'Abacate', base_rules || '{
  "spray": {"wind_max_kmh": 14},
  "disease": {"rh_pct": 85, "rain_24h_mm": 3},
  "heat": {"max_temp_c": 34},
  "frost": {"min_temp_c": 3},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {"spray": {"temp_max_c": 28}},
    "frutificacao": {"spray": {"dry_window_h": 8}},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 5) CANA-DE-AÇÚCAR
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('cana_de_acucar', 'Cana-de-açúcar', base_rules || '{
  "spray": {"wind_max_kmh": 16},
  "disease": {"rain_24h_mm": 4},
  "heat": {"max_temp_c": 36},
  "frost": {"min_temp_c": 1},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {"spray": {"dry_window_h": 8}},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 6) FLORESTAIS
-- Eucalipto
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('eucalipto', 'Eucalipto', base_rules || '{
  "spray": {"wind_max_kmh": 18},
  "disease": {"rain_24h_mm": 4},
  "heat": {"max_temp_c": 36},
  "frost": {"min_temp_c": 0},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {"spray": {"temp_max_c": 32}},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

-- 7) PASTAGENS
INSERT INTO public.crop_profiles (crop_code, display_name, default_rules)
VALUES ('pastagem', 'Pastagem', base_rules || '{
  "spray": {"wind_max_kmh": 16},
  "heat": {"max_temp_c": 35},
  "by_stage": {
    "semeadura": {},
    "emergencia": {},
    "vegetativo": {"spray": {"rh_min_pct": 40}},
    "floracao": {},
    "frutificacao": {},
    "maturacao": {},
    "colheita": {}
  }
}'::jsonb)
ON CONFLICT (crop_code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  default_rules = EXCLUDED.default_rules;

END $$;