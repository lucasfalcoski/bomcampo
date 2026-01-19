-- Create enum for action types
CREATE TYPE public.action_type AS ENUM (
  'create_planting',
  'create_activity',
  'create_occurrence',
  'schedule_task',
  'update_planting_stage',
  'log_weather_event'
);

-- Create enum for draft status
CREATE TYPE public.action_draft_status AS ENUM (
  'collecting',
  'ready',
  'awaiting_review',
  'approved',
  'rejected',
  'confirmed',
  'cancelled'
);

-- Create action_drafts table
CREATE TABLE public.action_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  created_by_user_id UUID NOT NULL,
  action_type public.action_type NOT NULL,
  status public.action_draft_status NOT NULL DEFAULT 'collecting',
  draft_json JSONB NOT NULL DEFAULT '{}',
  missing_fields TEXT[] DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'ai_chat',
  reviewer_user_id UUID,
  reviewer_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_drafts ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own drafts
CREATE POLICY "Users can view own drafts"
ON public.action_drafts FOR SELECT
USING (created_by_user_id = auth.uid());

-- RLS: Workspace owner/manager can view workspace drafts
CREATE POLICY "Workspace admins can view workspace drafts"
ON public.action_drafts FOR SELECT
USING (
  workspace_id IS NOT NULL AND 
  is_workspace_admin(auth.uid(), workspace_id)
);

-- RLS: Agronomists can view awaiting_review drafts for their farms
CREATE POLICY "Agronomists can view awaiting review drafts"
ON public.action_drafts FOR SELECT
USING (
  status = 'awaiting_review' AND
  farm_id IS NOT NULL AND
  is_farm_agronomist(auth.uid(), farm_id)
);

-- RLS: Superadmin can view all
CREATE POLICY "Superadmin can view all drafts"
ON public.action_drafts FOR SELECT
USING (is_superadmin(auth.uid()));

-- RLS: Users can create their own drafts
CREATE POLICY "Users can create own drafts"
ON public.action_drafts FOR INSERT
WITH CHECK (created_by_user_id = auth.uid());

-- RLS: Users can update their own drafts (while collecting/ready)
CREATE POLICY "Users can update own drafts"
ON public.action_drafts FOR UPDATE
USING (
  created_by_user_id = auth.uid() AND 
  status IN ('collecting', 'ready')
);

-- RLS: Agronomists can update awaiting_review drafts (approve/reject)
CREATE POLICY "Agronomists can review drafts"
ON public.action_drafts FOR UPDATE
USING (
  status = 'awaiting_review' AND
  farm_id IS NOT NULL AND
  is_farm_agronomist(auth.uid(), farm_id)
);

-- RLS: Superadmin can update any draft
CREATE POLICY "Superadmin can update any draft"
ON public.action_drafts FOR UPDATE
USING (is_superadmin(auth.uid()));

-- RLS: Users can delete their own drafts (while not confirmed)
CREATE POLICY "Users can delete own drafts"
ON public.action_drafts FOR DELETE
USING (
  created_by_user_id = auth.uid() AND 
  status NOT IN ('confirmed')
);

-- Trigger for updated_at
CREATE TRIGGER update_action_drafts_updated_at
BEFORE UPDATE ON public.action_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add feature flags for AI actions
INSERT INTO public.feature_flags_global (key, value_json)
VALUES 
  ('ai_actions_enabled', 'false'::jsonb),
  ('ai_actions_enabled_premium', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Create index for faster queries
CREATE INDEX idx_action_drafts_user ON public.action_drafts(created_by_user_id);
CREATE INDEX idx_action_drafts_workspace ON public.action_drafts(workspace_id) WHERE workspace_id IS NOT NULL;
CREATE INDEX idx_action_drafts_farm_awaiting ON public.action_drafts(farm_id) WHERE status = 'awaiting_review';
CREATE INDEX idx_action_drafts_status ON public.action_drafts(status);