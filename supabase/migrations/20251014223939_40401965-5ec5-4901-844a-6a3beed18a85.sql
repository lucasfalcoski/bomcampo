-- 1) Criar tabela de tipos de atividades (catálogo)
CREATE TABLE IF NOT EXISTS public.activity_types (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tornar catálogo público para leitura
ALTER TABLE public.activity_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity types"
  ON public.activity_types
  FOR SELECT
  USING (true);

-- 2) Garantir que activities tem as colunas necessárias
ALTER TABLE public.activities 
  ADD COLUMN IF NOT EXISTS planting_id uuid REFERENCES public.plantings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS responsavel text,
  ADD COLUMN IF NOT EXISTS anexo_url text;

-- 3) Criar índices úteis
CREATE INDEX IF NOT EXISTS idx_activities_plot ON public.activities(plot_id);
CREATE INDEX IF NOT EXISTS idx_activities_tipo ON public.activities(tipo);
CREATE INDEX IF NOT EXISTS idx_activities_data ON public.activities(data);
CREATE INDEX IF NOT EXISTS idx_activities_planting ON public.activities(planting_id);

-- 4) Seed do catálogo de ações
INSERT INTO public.activity_types (code, display_name, category) VALUES
  -- Solo & Implantação
  ('solo_amostra', 'Amostragem de solo', 'Solo'),
  ('solo_correcao', 'Correção de solo (calagem/gessagem)', 'Solo'),
  ('preparo_aracao', 'Preparo: aração', 'Solo'),
  ('preparo_gradagem', 'Preparo: gradagem', 'Solo'),
  ('preparo_subsolagem', 'Preparo: subsolagem/escarificação', 'Solo'),
  ('implantacao_semeadura', 'Semeadura/Plantio', 'Implantação'),
  ('implantacao_transplantio', 'Transplantio', 'Implantação'),
  ('cobertura_vegetal', 'Cobertura vegetal/rolo-faca', 'Implantação'),
  
  -- Nutrição
  ('nutricao_base', 'Adubação de base', 'Nutrição'),
  ('nutricao_cobertura', 'Adubação de cobertura', 'Nutrição'),
  ('nutricao_foliar', 'Aplicação foliar (micros/bioestimulante)', 'Nutrição'),
  ('fertirrigacao', 'Fertirrigação', 'Nutrição'),
  
  -- Irrigação & Água
  ('irrigacao', 'Irrigação', 'Irrigação'),
  ('irrigacao_manutencao', 'Manutenção do sistema de irrigação', 'Irrigação'),
  ('drenagem', 'Drenagem/Desassoreamento', 'Irrigação'),
  
  -- Proteção de Plantas
  ('pulverizacao_fungicida', 'Pulverização (Fungicida)', 'Proteção'),
  ('pulverizacao_inseticida', 'Pulverização (Inseticida)', 'Proteção'),
  ('pulverizacao_herbicida', 'Pulverização (Herbicida)', 'Proteção'),
  ('controle_mecanico', 'Controle mecânico (roçada/capina)', 'Proteção'),
  ('armadilhas_mip', 'Armadilhas/iscas (MIP)', 'Proteção'),
  
  -- Manejo vegetativo
  ('manejo_desbaste', 'Desbaste', 'Manejo'),
  ('manejo_poda', 'Podas/Desbrotas', 'Manejo'),
  ('manejo_tutoramento', 'Tutoramento/Amarração', 'Manejo'),
  ('manejo_rocada_entre_linhas', 'Roçada entre linhas', 'Manejo'),
  ('cobertura_solo', 'Cobertura de solo (palhada/mulching)', 'Manejo'),
  
  -- Monitoramento & Amostragens
  ('monitoramento_pragas', 'Monitoramento de pragas/doenças', 'Monitoramento'),
  ('amostra_foliar', 'Amostragem foliar', 'Monitoramento'),
  ('contagem_estande', 'Contagem de estande', 'Monitoramento'),
  ('umidade_solo', 'Leitura de umidade do solo', 'Monitoramento'),
  
  -- Colheita & Pós
  ('colheita', 'Colheita', 'Colheita'),
  ('transporte', 'Transporte', 'Colheita'),
  ('secagem', 'Secagem/Terreiro', 'Colheita'),
  ('armazenamento', 'Armazenamento/Beneficiamento', 'Colheita'),
  
  -- Infra
  ('infra_cercas', 'Manutenção de cercas', 'Infra'),
  ('infra_estradas', 'Manutenção de estradas internas', 'Infra'),
  ('infra_equipamentos', 'Manutenção de equipamentos', 'Infra')
ON CONFLICT (code) 
DO UPDATE SET 
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category;