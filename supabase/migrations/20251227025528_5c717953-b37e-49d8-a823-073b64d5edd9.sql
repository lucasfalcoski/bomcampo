
-- Add RLS policies for system_admin to manage profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'system_admin'));

-- Add policy for system_admin to manage partners (in addition to admin)
DROP POLICY IF EXISTS "Admins can manage partners" ON public.partners;
CREATE POLICY "Admins can manage partners"
ON public.partners
FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'system_admin'));

-- Add policies for system_admin to manage user_roles
CREATE POLICY "System admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'system_admin'));

-- Function to get user emails (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id
$$;

-- Function to get users by partner with emails
CREATE OR REPLACE FUNCTION public.get_partner_users(_partner_id uuid)
RETURNS TABLE(user_id uuid, email text, partner_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id as user_id, u.email, p.partner_id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.partner_id = _partner_id
$$;

-- Function to find user by email
CREATE OR REPLACE FUNCTION public.find_user_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM auth.users WHERE email = _email LIMIT 1
$$;
