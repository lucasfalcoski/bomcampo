-- Create admin audit log table
CREATE TABLE public.admin_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.admin_audit_log IS 'Audit log for admin actions';

-- Enable RLS
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only system admins can view audit logs
CREATE POLICY "System admins can view audit logs"
ON public.admin_audit_log
FOR SELECT
USING (has_role(auth.uid(), 'system_admin'));

-- Only system admins can insert audit logs
CREATE POLICY "System admins can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- Create index for common queries
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_target ON public.admin_audit_log(target_type, target_id);