
-- Drop a função existente primeiro
DROP FUNCTION IF EXISTS public.get_prices_series(text, text, integer);

-- preços normalizados
CREATE TABLE IF NOT EXISTS public.commodity_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  product text NOT NULL,
  market text NOT NULL,
  unit text NOT NULL,
  price numeric NOT NULL,
  quote_at date NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_cp_prod_market_date ON public.commodity_prices(product, market, quote_at);

-- RLS
ALTER TABLE public.commodity_prices ENABLE ROW LEVEL SECURITY;

-- leitura de preços liberada para usuários logados
CREATE POLICY sel_prices_auth ON public.commodity_prices
FOR SELECT TO authenticated USING (true);

-- escrita só por função/service role
REVOKE INSERT, UPDATE, DELETE ON public.commodity_prices FROM authenticated;

-- Criar a função RPC para usar a nova tabela
CREATE OR REPLACE FUNCTION public.get_prices_series(p_product text, p_market text, p_days int DEFAULT 90)
RETURNS TABLE (date date, price numeric, unit text, source text)
LANGUAGE sql STABLE AS $$
  SELECT quote_at::date as date, price, unit, source
  FROM public.commodity_prices
  WHERE product = p_product
    AND market = p_market
    AND quote_at >= CURRENT_DATE - (p_days||' days')::interval
  ORDER BY quote_at ASC;
$$;

-- Inserir dados de exemplo
INSERT INTO public.commodity_prices (source, product, market, unit, price, quote_at, metadata) VALUES
('tradingeconomics','soja','CBOT','US$/bu',12.6, CURRENT_DATE - 4, '{"demo":true}'),
('tradingeconomics','soja','CBOT','US$/bu',12.8, CURRENT_DATE - 3, '{"demo":true}'),
('tradingeconomics','soja','CBOT','US$/bu',12.4, CURRENT_DATE - 2, '{"demo":true}'),
('tradingeconomics','soja','CBOT','US$/bu',12.9, CURRENT_DATE - 1, '{"demo":true}'),
('tradingeconomics','soja','CBOT','US$/bu',13.0, CURRENT_DATE, '{"demo":true}'),
('conab','soja','MT','R$/sc(60kg)',140.5, CURRENT_DATE - 7, '{"demo":true}'),
('conab','soja','MT','R$/sc(60kg)',142.0, CURRENT_DATE, '{"demo":true}'),
('tradingeconomics','milho','CBOT','US$/bu',4.7, CURRENT_DATE - 4, '{"demo":true}'),
('tradingeconomics','milho','CBOT','US$/bu',4.8, CURRENT_DATE - 2, '{"demo":true}'),
('tradingeconomics','milho','CBOT','US$/bu',4.9, CURRENT_DATE, '{"demo":true}'),
('conab','milho','PR','R$/sc(60kg)',65.2, CURRENT_DATE - 7, '{"demo":true}'),
('conab','milho','PR','R$/sc(60kg)',66.1, CURRENT_DATE, '{"demo":true}');
