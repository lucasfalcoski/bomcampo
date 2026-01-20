-- =============================================
-- POP ENGINE: Enhanced Schema
-- =============================================

-- 1) Create pop_categories table
CREATE TABLE IF NOT EXISTS public.pop_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  icon TEXT DEFAULT '📋',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pop_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view pop_categories"
ON public.pop_categories
FOR SELECT
USING (true);

-- Only superadmin can manage categories
CREATE POLICY "Superadmin can manage pop_categories"
ON public.pop_categories
FOR ALL
USING (is_superadmin(auth.uid()));

-- 2) Enhance pops table with new columns
ALTER TABLE public.pops 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.pop_categories(id),
  ADD COLUMN IF NOT EXISTS triggers TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS crops TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS severity_levels TEXT[] NOT NULL DEFAULT ARRAY['baixa', 'media', 'alta'],
  ADD COLUMN IF NOT EXISTS content_markdown TEXT,
  ADD COLUMN IF NOT EXISTS triage_questions TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS actions JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Create index for faster keyword matching
CREATE INDEX IF NOT EXISTS idx_pops_triggers ON public.pops USING GIN(triggers);
CREATE INDEX IF NOT EXISTS idx_pops_crops ON public.pops USING GIN(crops);
CREATE INDEX IF NOT EXISTS idx_pops_keywords ON public.pops USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_pops_category_id ON public.pops(category_id);

-- 3) Create pop_usage_logs table for analytics
CREATE TABLE IF NOT EXISTS public.pop_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id),
  farm_id UUID REFERENCES public.farms(id),
  field_id UUID REFERENCES public.plots(id),
  question TEXT NOT NULL,
  matched_pop_id UUID REFERENCES public.pops(id),
  matched_category_id UUID REFERENCES public.pop_categories(id),
  match_type TEXT NOT NULL CHECK (match_type IN ('pop', 'category', 'ai', 'fallback')),
  match_score NUMERIC(5,4),
  used_ai BOOLEAN NOT NULL DEFAULT false,
  ai_status TEXT CHECK (ai_status IN ('success', 'retry', 'failed', 'skipped')),
  response_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pop_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage logs
CREATE POLICY "Users can view own pop_usage_logs"
ON public.pop_usage_logs
FOR SELECT
USING (user_id = auth.uid() OR is_superadmin(auth.uid()));

-- System can insert usage logs
CREATE POLICY "System can insert pop_usage_logs"
ON public.pop_usage_logs
FOR INSERT
WITH CHECK (user_id = auth.uid() OR is_superadmin(auth.uid()));

-- Superadmin can view all
CREATE POLICY "Superadmin can manage pop_usage_logs"
ON public.pop_usage_logs
FOR ALL
USING (is_superadmin(auth.uid()));

-- Create indexes for analytics
CREATE INDEX IF NOT EXISTS idx_pop_usage_logs_user ON public.pop_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pop_usage_logs_workspace ON public.pop_usage_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pop_usage_logs_created ON public.pop_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pop_usage_logs_match_type ON public.pop_usage_logs(match_type);

-- 4) Create function to update updated_at on pop_categories
CREATE OR REPLACE FUNCTION public.update_pop_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS update_pop_categories_updated_at ON public.pop_categories;
CREATE TRIGGER update_pop_categories_updated_at
  BEFORE UPDATE ON public.pop_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pop_categories_updated_at();