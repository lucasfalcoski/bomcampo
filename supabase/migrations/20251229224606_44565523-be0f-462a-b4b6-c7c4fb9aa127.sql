-- Fix function search_path for get_prices_series
CREATE OR REPLACE FUNCTION public.get_prices_series(p_product text, p_market text, p_days integer DEFAULT 90)
 RETURNS TABLE(date date, price numeric, unit text, source text)
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $$
  SELECT quote_at::date as date, price, unit, source
  FROM public.commodity_prices
  WHERE product = p_product
    AND market = p_market
    AND quote_at >= CURRENT_DATE - (p_days||' days')::interval
  ORDER BY quote_at ASC;
$$;