-- Alterar coluna activities.tipo de enum para text
ALTER TABLE public.activities 
ALTER COLUMN tipo TYPE text;

-- Remover o enum antigo activity_type se existir
DROP TYPE IF EXISTS activity_type CASCADE;