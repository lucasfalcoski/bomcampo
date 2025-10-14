-- Add municipality columns to plots table
ALTER TABLE public.plots
ADD COLUMN IF NOT EXISTS municipality_name text,
ADD COLUMN IF NOT EXISTS municipality_ibge_code text;

-- Add comment for clarity
COMMENT ON COLUMN public.plots.municipality_name IS 'Nome do município (opcional, usado quando lat/lon não disponíveis)';
COMMENT ON COLUMN public.plots.municipality_ibge_code IS 'Código IBGE do município (opcional)';