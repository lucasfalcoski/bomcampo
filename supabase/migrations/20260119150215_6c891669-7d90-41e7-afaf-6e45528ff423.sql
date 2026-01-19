-- =============================================
-- MULTI-TENANT ARCHITECTURE MIGRATION
-- =============================================

-- 1. Create enum types
CREATE TYPE public.workspace_type AS ENUM ('b2c', 'b2b');
CREATE TYPE public.workspace_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE public.workspace_plan AS ENUM ('free', 'premium', 'enterprise');
CREATE TYPE public.workspace_role AS ENUM ('owner', 'manager', 'operator', 'agronomist', 'viewer');
CREATE TYPE public.system_role AS ENUM ('superadmin', 'support', 'ops');
CREATE TYPE public.ai_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE public.agro_question_status AS ENUM ('open', 'in_progress', 'answered', 'closed');
CREATE TYPE public.channel_preference AS ENUM ('panel', 'whatsapp', 'email');

-- 2. Create user_system_roles table for superadmin/support/ops
CREATE TABLE public.user_system_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role system_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create workspaces table
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type workspace_type NOT NULL DEFAULT 'b2c',
  status workspace_status NOT NULL DEFAULT 'active',
  plan workspace_plan NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create workspace_members table
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- 5. Add workspace_id to existing farms table
ALTER TABLE public.farms ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

-- 6. Create farm_agronomists table
CREATE TABLE public.farm_agronomists (
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  agronomist_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  channel_pref channel_preference NOT NULL DEFAULT 'panel',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (farm_id, agronomist_user_id)
);

-- 7. Create feature_flags_global table
CREATE TABLE public.feature_flags_global (
  key TEXT PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create feature_flags_workspace table
CREATE TABLE public.feature_flags_workspace (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, key)
);

-- 9. Create campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  rule_json JSONB,
  payload_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create integrations_status table
CREATE TABLE public.integrations_status (
  provider TEXT PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_ok_at TIMESTAMPTZ,
  last_error TEXT,
  latency_ms INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Create ai_conversations table
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Create ai_messages table
CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role ai_message_role NOT NULL,
  content TEXT NOT NULL,
  meta_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Create ai_usage_log table
CREATE TABLE public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  requests INTEGER NOT NULL DEFAULT 0,
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Create agro_questions table
CREATE TABLE public.agro_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID REFERENCES public.farms(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  asked_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  context_json JSONB,
  status agro_question_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Create agro_answers table
CREATE TABLE public.agro_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agro_question_id UUID NOT NULL REFERENCES public.agro_questions(id) ON DELETE CASCADE,
  answered_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if user has a system role (superadmin/support/ops)
CREATE OR REPLACE FUNCTION public.has_system_role(_user_id UUID, _role system_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_system_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_system_roles
    WHERE user_id = _user_id AND role = 'superadmin'
  )
$$;

-- Check if user is superadmin, support, or ops
CREATE OR REPLACE FUNCTION public.is_system_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_system_roles
    WHERE user_id = _user_id
  )
$$;

-- Check if user is member of workspace
CREATE OR REPLACE FUNCTION public.is_workspace_member(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id AND workspace_id = _workspace_id
  )
$$;

-- Check if user has specific role in workspace
CREATE OR REPLACE FUNCTION public.has_workspace_role(_user_id UUID, _workspace_id UUID, _role workspace_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id 
      AND workspace_id = _workspace_id 
      AND role = _role
  )
$$;

-- Check if user is owner or manager in workspace
CREATE OR REPLACE FUNCTION public.is_workspace_admin(_user_id UUID, _workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE user_id = _user_id 
      AND workspace_id = _workspace_id 
      AND role IN ('owner', 'manager')
  )
$$;

-- Check if user is agronomist for a farm
CREATE OR REPLACE FUNCTION public.is_farm_agronomist(_user_id UUID, _farm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.farm_agronomists
    WHERE agronomist_user_id = _user_id AND farm_id = _farm_id
  )
$$;

-- Get workspace_id for a farm
CREATE OR REPLACE FUNCTION public.get_farm_workspace_id(_farm_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM public.farms WHERE id = _farm_id
$$;

-- =============================================
-- ENABLE RLS ON ALL NEW TABLES
-- =============================================

ALTER TABLE public.user_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_agronomists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags_global ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags_workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_answers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- user_system_roles: only superadmin can manage
CREATE POLICY "Superadmin can view all system roles"
ON public.user_system_roles FOR SELECT
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert system roles"
ON public.user_system_roles FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update system roles"
ON public.user_system_roles FOR UPDATE
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete system roles"
ON public.user_system_roles FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- Users can view their own system role
CREATE POLICY "Users can view own system role"
ON public.user_system_roles FOR SELECT
USING (auth.uid() = user_id);

-- workspaces: members can view; superadmin can manage all
CREATE POLICY "Workspace members can view their workspaces"
ON public.workspaces FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_member(auth.uid(), id)
);

CREATE POLICY "Superadmin can insert workspaces"
ON public.workspaces FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Workspace admins or superadmin can update workspaces"
ON public.workspaces FOR UPDATE
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), id)
);

CREATE POLICY "Superadmin can delete workspaces"
ON public.workspaces FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- workspace_members: owner/manager can manage members; superadmin can manage all
CREATE POLICY "Workspace members can view members"
ON public.workspace_members FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Workspace admins or superadmin can insert members"
ON public.workspace_members FOR INSERT
WITH CHECK (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), workspace_id)
);

CREATE POLICY "Workspace admins or superadmin can update members"
ON public.workspace_members FOR UPDATE
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), workspace_id)
);

CREATE POLICY "Workspace admins or superadmin can delete members"
ON public.workspace_members FOR DELETE
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), workspace_id)
);

-- farm_agronomists: workspace members can view; owner/manager can manage
CREATE POLICY "Workspace members can view farm agronomists"
ON public.farm_agronomists FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_member(auth.uid(), public.get_farm_workspace_id(farm_id)) OR
  agronomist_user_id = auth.uid()
);

CREATE POLICY "Workspace admins or superadmin can insert farm agronomists"
ON public.farm_agronomists FOR INSERT
WITH CHECK (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), public.get_farm_workspace_id(farm_id))
);

CREATE POLICY "Workspace admins or superadmin can update farm agronomists"
ON public.farm_agronomists FOR UPDATE
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), public.get_farm_workspace_id(farm_id))
);

CREATE POLICY "Workspace admins or superadmin can delete farm agronomists"
ON public.farm_agronomists FOR DELETE
USING (
  public.is_superadmin(auth.uid()) OR
  public.is_workspace_admin(auth.uid(), public.get_farm_workspace_id(farm_id))
);

-- feature_flags_global: only superadmin/ops can manage; system staff can read
CREATE POLICY "System staff can view global flags"
ON public.feature_flags_global FOR SELECT
USING (public.is_system_staff(auth.uid()));

CREATE POLICY "Superadmin can insert global flags"
ON public.feature_flags_global FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update global flags"
ON public.feature_flags_global FOR UPDATE
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete global flags"
ON public.feature_flags_global FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- feature_flags_workspace: superadmin/ops only
CREATE POLICY "System staff can view workspace flags"
ON public.feature_flags_workspace FOR SELECT
USING (public.is_system_staff(auth.uid()));

CREATE POLICY "Superadmin can insert workspace flags"
ON public.feature_flags_workspace FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update workspace flags"
ON public.feature_flags_workspace FOR UPDATE
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete workspace flags"
ON public.feature_flags_workspace FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- campaigns: superadmin/ops only
CREATE POLICY "System staff can view campaigns"
ON public.campaigns FOR SELECT
USING (public.is_system_staff(auth.uid()));

CREATE POLICY "Superadmin can insert campaigns"
ON public.campaigns FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update campaigns"
ON public.campaigns FOR UPDATE
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete campaigns"
ON public.campaigns FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- integrations_status: superadmin/ops only
CREATE POLICY "System staff can view integrations status"
ON public.integrations_status FOR SELECT
USING (public.is_system_staff(auth.uid()));

CREATE POLICY "Superadmin can insert integrations status"
ON public.integrations_status FOR INSERT
WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can update integrations status"
ON public.integrations_status FOR UPDATE
USING (public.is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can delete integrations status"
ON public.integrations_status FOR DELETE
USING (public.is_superadmin(auth.uid()));

-- ai_conversations: workspace members access their own; superadmin sees all
CREATE POLICY "Users can view own AI conversations"
ON public.ai_conversations FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id))
);

CREATE POLICY "Users can create own AI conversations"
ON public.ai_conversations FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY "Users can update own AI conversations"
ON public.ai_conversations FOR UPDATE
USING (
  public.is_superadmin(auth.uid()) OR
  user_id = auth.uid()
);

-- ai_messages: access through conversation ownership
CREATE POLICY "Users can view AI messages from their conversations"
ON public.ai_messages FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR public.is_workspace_member(auth.uid(), c.workspace_id))
  )
);

CREATE POLICY "Users can insert AI messages to their conversations"
ON public.ai_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

-- ai_usage_log: users see own usage; workspace admins see workspace usage; superadmin sees all
CREATE POLICY "Users can view own AI usage"
ON public.ai_usage_log FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND public.is_workspace_admin(auth.uid(), workspace_id))
);

CREATE POLICY "System can insert AI usage"
ON public.ai_usage_log FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR public.is_superadmin(auth.uid())
);

-- agro_questions: workspace members view; agronomist can view assigned; superadmin sees all
CREATE POLICY "Users can view agro questions"
ON public.agro_questions FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  asked_by_user_id = auth.uid() OR
  (workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), workspace_id)) OR
  (farm_id IS NOT NULL AND public.is_farm_agronomist(auth.uid(), farm_id))
);

CREATE POLICY "Users can create agro questions"
ON public.agro_questions FOR INSERT
WITH CHECK (
  asked_by_user_id = auth.uid()
);

CREATE POLICY "Users and agronomists can update agro questions"
ON public.agro_questions FOR UPDATE
USING (
  public.is_superadmin(auth.uid()) OR
  asked_by_user_id = auth.uid() OR
  (farm_id IS NOT NULL AND public.is_farm_agronomist(auth.uid(), farm_id))
);

-- agro_answers: linked users and agronomists can view; agronomists can answer
CREATE POLICY "Users can view agro answers"
ON public.agro_answers FOR SELECT
USING (
  public.is_superadmin(auth.uid()) OR
  answered_by_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.agro_questions q
    WHERE q.id = agro_question_id
      AND (
        q.asked_by_user_id = auth.uid() OR
        (q.workspace_id IS NOT NULL AND public.is_workspace_member(auth.uid(), q.workspace_id)) OR
        (q.farm_id IS NOT NULL AND public.is_farm_agronomist(auth.uid(), q.farm_id))
      )
  )
);

CREATE POLICY "Agronomists can insert agro answers"
ON public.agro_answers FOR INSERT
WITH CHECK (
  answered_by_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.agro_questions q
    WHERE q.id = agro_question_id
      AND (
        public.is_superadmin(auth.uid()) OR
        (q.farm_id IS NOT NULL AND public.is_farm_agronomist(auth.uid(), q.farm_id)) OR
        (q.workspace_id IS NOT NULL AND public.has_workspace_role(auth.uid(), q.workspace_id, 'agronomist'))
      )
  )
);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================

CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_global_updated_at
BEFORE UPDATE ON public.feature_flags_global
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_flags_workspace_updated_at
BEFORE UPDATE ON public.feature_flags_workspace
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integrations_status_updated_at
BEFORE UPDATE ON public.integrations_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agro_questions_updated_at
BEFORE UPDATE ON public.agro_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_workspace_members_user_id ON public.workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON public.workspace_members(workspace_id);
CREATE INDEX idx_farms_workspace_id ON public.farms(workspace_id);
CREATE INDEX idx_farm_agronomists_agronomist_id ON public.farm_agronomists(agronomist_user_id);
CREATE INDEX idx_ai_conversations_user_id ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_workspace_id ON public.ai_conversations(workspace_id);
CREATE INDEX idx_ai_messages_conversation_id ON public.ai_messages(conversation_id);
CREATE INDEX idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_workspace_day ON public.ai_usage_log(workspace_id, day);
CREATE INDEX idx_agro_questions_farm_id ON public.agro_questions(farm_id);
CREATE INDEX idx_agro_questions_workspace_id ON public.agro_questions(workspace_id);
CREATE INDEX idx_agro_questions_status ON public.agro_questions(status);
CREATE INDEX idx_agro_answers_question_id ON public.agro_answers(agro_question_id);

-- =============================================
-- SEED DATA
-- =============================================

-- Feature flags global (default values)
INSERT INTO public.feature_flags_global (key, value_json) VALUES
  ('ai_enabled', '{"enabled": false}'::jsonb),
  ('ai_daily_quota_free', '{"value": 0}'::jsonb),
  ('ai_daily_quota_premium', '{"value": 150}'::jsonb),
  ('ai_photo_enabled', '{"enabled": false}'::jsonb),
  ('respondeagro_enabled', '{"enabled": true}'::jsonb),
  ('agritec_enabled', '{"enabled": false}'::jsonb),
  ('satveg_enabled', '{"enabled": false}'::jsonb);

-- Integrations status (default providers)
INSERT INTO public.integrations_status (provider, is_enabled, last_error) VALUES
  ('openai', false, NULL),
  ('respondeagro', false, NULL),
  ('agritec', false, NULL),
  ('satveg', false, NULL);