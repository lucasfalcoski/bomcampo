-- Create partners table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
  branding_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Partners are readable by authenticated users
CREATE POLICY "Authenticated users can view partners"
ON public.partners FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage partners
CREATE POLICY "Admins can manage partners"
ON public.partners FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add partner_id and origin to profiles table
ALTER TABLE public.profiles
ADD COLUMN partner_id UUID REFERENCES public.partners(id),
ADD COLUMN origin public.user_origin DEFAULT 'B2C';

-- Create fala_agronomo_conversation table
CREATE TABLE public.fala_agronomo_conversation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partners(id),
  context public.fala_agronomo_context NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on conversations
ALTER TABLE public.fala_agronomo_conversation ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.fala_agronomo_conversation FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own conversations
CREATE POLICY "Users can create own conversations"
ON public.fala_agronomo_conversation FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations"
ON public.fala_agronomo_conversation FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create fala_agronomo_message table
CREATE TABLE public.fala_agronomo_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.fala_agronomo_conversation(id) ON DELETE CASCADE NOT NULL,
  sender_type public.message_sender_type NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on messages
ALTER TABLE public.fala_agronomo_message ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their own conversations
CREATE POLICY "Users can view own conversation messages"
ON public.fala_agronomo_message FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.fala_agronomo_conversation c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);

-- Users can insert messages in their own conversations
CREATE POLICY "Users can insert messages in own conversations"
ON public.fala_agronomo_message FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.fala_agronomo_conversation c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  )
);