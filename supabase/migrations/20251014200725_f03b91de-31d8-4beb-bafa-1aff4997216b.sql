-- Habilitar extensão pg_cron se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar cron job para verificar alertas de chuva (diariamente às 06:00)
SELECT cron.schedule(
  'check-weather-alerts-daily',
  '0 6 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://bnqyjdjbhuxfercfyenh.supabase.co/functions/v1/check-weather-alerts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucXlqZGpiaHV4ZmVyY2Z5ZW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTk1NzQsImV4cCI6MjA3NjAzNTU3NH0.u406j73s0rBbSNNHbC_dHxELjtRl9zS3NdKz9j3e5vc"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Criar cron job para enviar lembretes de atividades (diariamente às 18:00)
SELECT cron.schedule(
  'send-activity-reminders-daily',
  '0 18 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://bnqyjdjbhuxfercfyenh.supabase.co/functions/v1/send-activity-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucXlqZGpiaHV4ZmVyY2Z5ZW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NTk1NzQsImV4cCI6MjA3NjAzNTU3NH0.u406j73s0rBbSNNHbC_dHxELjtRl9zS3NdKz9j3e5vc"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas para executar jobs periodicamente';