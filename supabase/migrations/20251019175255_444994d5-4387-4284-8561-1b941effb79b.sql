
-- Drop existing policy if it exists
DROP POLICY IF EXISTS sel_prices_auth ON public.commodity_prices;

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

-- Recriar policy
CREATE POLICY sel_prices_auth ON public.commodity_prices
FOR SELECT TO authenticated USING (true);
