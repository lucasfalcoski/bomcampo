-- Adicionar preferências de notificação na tabela weather_prefs
ALTER TABLE public.weather_prefs
ADD COLUMN IF NOT EXISTS notif_alerta_chuva BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_lembretes_atividades BOOLEAN DEFAULT true;

-- Criar tabela de log de notificações
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('alerta_chuva', 'lembrete_atividades')),
  referencia_data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para notifications_log
CREATE POLICY "Users can view own notification logs"
ON public.notifications_log
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs"
ON public.notifications_log
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Criar índice para performance
CREATE INDEX idx_notifications_log_user_tipo_data 
ON public.notifications_log (user_id, tipo, referencia_data);

COMMENT ON TABLE public.notifications_log IS 'Log de notificações enviadas aos usuários';
COMMENT ON COLUMN public.weather_prefs.notif_alerta_chuva IS 'Receber alertas de chuva por e-mail';
COMMENT ON COLUMN public.weather_prefs.notif_lembretes_atividades IS 'Receber lembretes de atividades por e-mail';