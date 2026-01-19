-- Create workspace_invites table for tracking pending invitations
CREATE TABLE public.workspace_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'cancelled', 'expired')),
  invited_by_user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_resent_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on pending invites
CREATE UNIQUE INDEX workspace_invites_pending_unique ON public.workspace_invites (email, workspace_id) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.workspace_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for workspace_invites
CREATE POLICY "Superadmin can view all invites"
  ON public.workspace_invites FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Workspace admins can view invites"
  ON public.workspace_invites FOR SELECT
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Superadmin can insert invites"
  ON public.workspace_invites FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Workspace admins can insert invites"
  ON public.workspace_invites FOR INSERT
  WITH CHECK (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Superadmin can update invites"
  ON public.workspace_invites FOR UPDATE
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Workspace admins can update invites"
  ON public.workspace_invites FOR UPDATE
  USING (is_workspace_admin(auth.uid(), workspace_id));

CREATE POLICY "Superadmin can delete invites"
  ON public.workspace_invites FOR DELETE
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Workspace admins can delete invites"
  ON public.workspace_invites FOR DELETE
  USING (is_workspace_admin(auth.uid(), workspace_id));

-- Create impersonation_sessions table
CREATE TABLE public.impersonation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  reason TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for impersonation_sessions
CREATE POLICY "Superadmin can view all impersonation sessions"
  ON public.impersonation_sessions FOR SELECT
  USING (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can insert impersonation sessions"
  ON public.impersonation_sessions FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Superadmin can update own impersonation sessions"
  ON public.impersonation_sessions FOR UPDATE
  USING (is_superadmin(auth.uid()) AND admin_user_id = auth.uid());

-- Add user_status column to profiles (suspended flag)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Create index on admin_audit_log for impersonation tracking
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log (action);

-- Add superadmin policy to admin_audit_log (system_role based)
CREATE POLICY "Superadmin can insert audit logs"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (is_superadmin(auth.uid()));

CREATE POLICY "Superadmin can view audit logs"
  ON public.admin_audit_log FOR SELECT
  USING (is_superadmin(auth.uid()));