-- Create price_series table to store historical commodity prices
CREATE TABLE public.price_series (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product TEXT NOT NULL, -- soja, milho, boi
  market TEXT NOT NULL, -- CBOT, MT, PR, SP
  date DATE NOT NULL,
  price NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'R$/saca',
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product, market, date)
);

-- Create price_alerts table for user price notifications
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product TEXT NOT NULL,
  market TEXT NOT NULL,
  condition TEXT NOT NULL, -- >=, <=, pct_up, pct_down
  threshold NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_series (public read access)
CREATE POLICY "Anyone can view price series"
ON public.price_series
FOR SELECT
USING (true);

-- RLS policies for price_alerts (user-specific)
CREATE POLICY "Users can view own price alerts"
ON public.price_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price alerts"
ON public.price_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
ON public.price_alerts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price alerts"
ON public.price_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_price_alerts_updated_at
BEFORE UPDATE ON public.price_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create RPC function to get price series
CREATE OR REPLACE FUNCTION public.get_prices_series(
  p_product TEXT,
  p_market TEXT,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  date TEXT,
  price NUMERIC,
  unit TEXT,
  source TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    TO_CHAR(date, 'YYYY-MM-DD') as date,
    price,
    unit,
    source
  FROM public.price_series
  WHERE product = p_product
    AND market = p_market
    AND date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY date ASC;
$$;

-- Insert some sample data for testing
INSERT INTO public.price_series (product, market, date, price, unit, source) VALUES
  ('soja', 'CBOT', CURRENT_DATE - INTERVAL '5 days', 142.50, 'R$/saca', 'CBOT'),
  ('soja', 'CBOT', CURRENT_DATE - INTERVAL '4 days', 143.20, 'R$/saca', 'CBOT'),
  ('soja', 'CBOT', CURRENT_DATE - INTERVAL '3 days', 141.80, 'R$/saca', 'CBOT'),
  ('soja', 'CBOT', CURRENT_DATE - INTERVAL '2 days', 144.00, 'R$/saca', 'CBOT'),
  ('soja', 'CBOT', CURRENT_DATE - INTERVAL '1 day', 143.50, 'R$/saca', 'CBOT'),
  ('soja', 'CBOT', CURRENT_DATE, 145.20, 'R$/saca', 'CBOT');