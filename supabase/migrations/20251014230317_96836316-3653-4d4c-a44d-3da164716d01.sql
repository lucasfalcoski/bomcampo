-- 1) Conciliação Atividade ↔ Transação
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS activity_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_activity ON public.transactions(activity_id);

-- 2) Índices úteis
CREATE INDEX IF NOT EXISTS idx_activities_realizado ON public.activities(realizado);
CREATE INDEX IF NOT EXISTS idx_tx_tipo_data ON public.transactions(tipo, data);

-- 3) Itens/insumos planejados
CREATE TABLE IF NOT EXISTS public.activity_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  insumo text NOT NULL,
  unidade text NULL,
  quantidade numeric NULL,
  custo_estimado_item numeric NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_items_activity ON public.activity_items(activity_id);

-- RLS para activity_items
ALTER TABLE public.activity_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity items"
  ON public.activity_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.plots pl ON pl.id = a.plot_id
      JOIN public.farms f ON f.id = pl.farm_id
      WHERE a.id = activity_items.activity_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert activity items in own activities"
  ON public.activity_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.plots pl ON pl.id = a.plot_id
      JOIN public.farms f ON f.id = pl.farm_id
      WHERE a.id = activity_items.activity_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own activity items"
  ON public.activity_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.plots pl ON pl.id = a.plot_id
      JOIN public.farms f ON f.id = pl.farm_id
      WHERE a.id = activity_items.activity_id
        AND f.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own activity items"
  ON public.activity_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      JOIN public.plots pl ON pl.id = a.plot_id
      JOIN public.farms f ON f.id = pl.farm_id
      WHERE a.id = activity_items.activity_id
        AND f.user_id = auth.uid()
    )
  );

-- 4) Métricas climáticas da atividade
ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS weather_snapshot jsonb NULL,
  ADD COLUMN IF NOT EXISTS clima_conforme boolean NULL;