-- Create agro_content table
CREATE TABLE public.agro_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('article', 'guide', 'faq')),
  culture TEXT,
  theme TEXT NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agro_video table
CREATE TABLE public.agro_video (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  duration_seconds INTEGER,
  culture TEXT,
  theme TEXT NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agro_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_video ENABLE ROW LEVEL SECURITY;

-- RLS for agro_content: users can view B2C content (partner_id IS NULL) and their partner's content
CREATE POLICY "Users can view B2C and own partner content"
ON public.agro_content
FOR SELECT
USING (
  is_active = true AND (
    partner_id IS NULL OR
    partner_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Admins can manage all content
CREATE POLICY "Admins can manage all content"
ON public.agro_content
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'partner_admin'::app_role)
);

-- RLS for agro_video: same logic
CREATE POLICY "Users can view B2C and own partner videos"
ON public.agro_video
FOR SELECT
USING (
  is_active = true AND (
    partner_id IS NULL OR
    partner_id = (SELECT partner_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- Admins can manage all videos
CREATE POLICY "Admins can manage all videos"
ON public.agro_video
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'partner_admin'::app_role)
);

-- Triggers for updated_at
CREATE TRIGGER update_agro_content_updated_at
BEFORE UPDATE ON public.agro_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agro_video_updated_at
BEFORE UPDATE ON public.agro_video
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();