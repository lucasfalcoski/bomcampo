-- =============================================
-- MÓDULO MERCADO V1 - Tabelas e Seed
-- =============================================

-- 1) Tabela de Praças
CREATE TABLE public.market_pracas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para buscas
CREATE INDEX idx_market_pracas_state ON public.market_pracas(state);
CREATE INDEX idx_market_pracas_active ON public.market_pracas(is_active);
CREATE UNIQUE INDEX idx_market_pracas_name_state ON public.market_pracas(name, state);

-- Enable RLS
ALTER TABLE public.market_pracas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Praças são públicas para leitura, admin para escrita
CREATE POLICY "Anyone can view active pracas"
  ON public.market_pracas FOR SELECT
  USING (is_active = true OR is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert pracas"
  ON public.market_pracas FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update pracas"
  ON public.market_pracas FOR UPDATE
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete pracas"
  ON public.market_pracas FOR DELETE
  USING (is_superadmin(auth.uid()));

-- 2) Tabela de Preços
CREATE TABLE public.market_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crop TEXT NOT NULL,
  praca_id UUID NOT NULL REFERENCES public.market_pracas(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'R$/saca',
  source TEXT NOT NULL DEFAULT 'manual_admin',
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_reference BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas
CREATE INDEX idx_market_prices_crop ON public.market_prices(crop);
CREATE INDEX idx_market_prices_praca ON public.market_prices(praca_id);
CREATE INDEX idx_market_prices_valid ON public.market_prices(valid_until);
CREATE INDEX idx_market_prices_crop_praca_valid ON public.market_prices(crop, praca_id, valid_until DESC);

-- Enable RLS
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Preços são públicos para leitura, admin para escrita
CREATE POLICY "Anyone can view prices"
  ON public.market_prices FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can insert prices"
  ON public.market_prices FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update prices"
  ON public.market_prices FOR UPDATE
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete prices"
  ON public.market_prices FOR DELETE
  USING (is_superadmin(auth.uid()));

-- 3) Tabela de Regras de Referência (TTL por cultura)
CREATE TABLE public.market_reference_rules (
  crop TEXT PRIMARY KEY,
  ttl_hours INTEGER NOT NULL DEFAULT 24,
  reference_window_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_reference_rules ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Anyone can view reference rules"
  ON public.market_reference_rules FOR SELECT
  USING (true);

CREATE POLICY "Superadmin can manage reference rules"
  ON public.market_reference_rules FOR ALL
  USING (is_superadmin(auth.uid()));

-- =============================================
-- SEED: Praças Brasileiras
-- =============================================

INSERT INTO public.market_pracas (name, state) VALUES
-- São Paulo
('Ribeirão Preto', 'SP'),
('Campinas', 'SP'),
('Sorocaba', 'SP'),
('São José do Rio Preto', 'SP'),
('Presidente Prudente', 'SP'),
('Marília', 'SP'),
('Bauru', 'SP'),
('Araçatuba', 'SP'),
('Piracicaba', 'SP'),
('São Paulo', 'SP'),
('Santos', 'SP'),
-- Paraná
('Londrina', 'PR'),
('Maringá', 'PR'),
('Cascavel', 'PR'),
('Ponta Grossa', 'PR'),
-- Minas Gerais
('Uberlândia', 'MG'),
('Uberaba', 'MG'),
('Patos de Minas', 'MG'),
('Unaí', 'MG'),
('Varginha', 'MG'),
('Guaxupé', 'MG'),
('Alfenas', 'MG'),
-- Goiás / DF
('Rio Verde', 'GO'),
('Jataí', 'GO'),
('Goiânia', 'GO'),
('Brasília', 'DF'),
-- Mato Grosso
('Rondonópolis', 'MT'),
('Sorriso', 'MT'),
('Sinop', 'MT'),
('Lucas do Rio Verde', 'MT'),
('Cuiabá', 'MT'),
-- Mato Grosso do Sul
('Dourados', 'MS'),
('Campo Grande', 'MS'),
-- Rio Grande do Sul
('Passo Fundo', 'RS'),
('Ijuí', 'RS'),
('Santa Maria', 'RS'),
-- Santa Catarina
('Chapecó', 'SC'),
-- Bahia
('Luís Eduardo Magalhães', 'BA'),
('Barreiras', 'BA'),
-- Maranhão / Tocantins / Piauí
('Balsas', 'MA'),
('Palmas', 'TO'),
('Uruçuí', 'PI')
ON CONFLICT (name, state) DO NOTHING;

-- =============================================
-- SEED: Regras de TTL por cultura
-- =============================================

INSERT INTO public.market_reference_rules (crop, ttl_hours, reference_window_days) VALUES
('soja', 24, 7),
('milho', 24, 7),
('feijao', 24, 7),
('trigo', 24, 7),
('sorgo', 24, 7),
('cafe', 24, 7)
ON CONFLICT (crop) DO NOTHING;

-- =============================================
-- FUNÇÃO: get_best_price(crop, praca_id)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_best_price(
  p_crop TEXT,
  p_praca_id UUID
)
RETURNS TABLE (
  price DECIMAL,
  unit TEXT,
  source TEXT,
  captured_at TIMESTAMP WITH TIME ZONE,
  valid_until TIMESTAMP WITH TIME ZONE,
  is_reference BOOLEAN,
  status TEXT,
  note TEXT
) AS $$
DECLARE
  v_rule RECORD;
  v_result RECORD;
BEGIN
  -- Buscar regras de referência para a cultura
  SELECT * INTO v_rule FROM public.market_reference_rules WHERE crop = p_crop;
  IF v_rule IS NULL THEN
    v_rule := ROW(p_crop, 24, 7);
  END IF;

  -- 1) Tentar preço válido (valid_until >= now)
  SELECT mp.price, mp.unit, mp.source, mp.captured_at, mp.valid_until, mp.is_reference, mp.note
  INTO v_result
  FROM public.market_prices mp
  WHERE mp.crop = p_crop 
    AND mp.praca_id = p_praca_id 
    AND mp.valid_until >= now()
  ORDER BY mp.captured_at DESC
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_result.price,
      v_result.unit,
      v_result.source,
      v_result.captured_at,
      v_result.valid_until,
      v_result.is_reference,
      'atualizado'::TEXT,
      v_result.note;
    RETURN;
  END IF;

  -- 2) Fallback: média dos últimos N dias (reference_window_days)
  SELECT 
    ROUND(AVG(mp.price), 2) as price,
    'R$/saca'::TEXT as unit,
    'referencia_media'::TEXT as source,
    MAX(mp.captured_at) as captured_at,
    now() as valid_until,
    true as is_reference,
    NULL::TEXT as note
  INTO v_result
  FROM public.market_prices mp
  WHERE mp.crop = p_crop 
    AND mp.praca_id = p_praca_id 
    AND mp.captured_at >= now() - (v_rule.reference_window_days || ' days')::INTERVAL;

  IF v_result.price IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_result.price,
      v_result.unit,
      v_result.source,
      v_result.captured_at,
      v_result.valid_until,
      v_result.is_reference,
      'referencia'::TEXT,
      v_result.note;
    RETURN;
  END IF;

  -- 3) Fallback final: última cotação histórica
  SELECT mp.price, mp.unit, mp.source, mp.captured_at, mp.valid_until, mp.is_reference, mp.note
  INTO v_result
  FROM public.market_prices mp
  WHERE mp.crop = p_crop 
    AND mp.praca_id = p_praca_id
  ORDER BY mp.captured_at DESC
  LIMIT 1;

  IF v_result IS NOT NULL THEN
    RETURN QUERY SELECT 
      v_result.price,
      v_result.unit,
      v_result.source,
      v_result.captured_at,
      v_result.valid_until,
      true::BOOLEAN,
      'referencia'::TEXT,
      v_result.note;
    RETURN;
  END IF;

  -- 4) Sem dados
  RETURN QUERY SELECT 
    NULL::DECIMAL,
    NULL::TEXT,
    NULL::TEXT,
    NULL::TIMESTAMP WITH TIME ZONE,
    NULL::TIMESTAMP WITH TIME ZONE,
    NULL::BOOLEAN,
    'indisponivel'::TEXT,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- FUNÇÃO: search_pracas(query, state_filter)
-- =============================================

CREATE OR REPLACE FUNCTION public.search_pracas(
  p_query TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  state TEXT,
  full_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id,
    mp.name,
    mp.state,
    (mp.name || '/' || mp.state)::TEXT as full_name
  FROM public.market_pracas mp
  WHERE mp.is_active = true
    AND (p_query IS NULL OR mp.name ILIKE '%' || p_query || '%')
    AND (p_state IS NULL OR mp.state = p_state)
  ORDER BY mp.state, mp.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;