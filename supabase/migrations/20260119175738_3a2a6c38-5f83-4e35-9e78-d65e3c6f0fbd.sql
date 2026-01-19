-- =============================================
-- COPILOTO IA: Tabelas tasks e field_occurrences
-- =============================================

-- Tabela: tasks (tarefas/checklist/lembretes)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  talhao_id uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  due_date date,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'cancelled')),
  created_by uuid NOT NULL,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Policies for tasks
CREATE POLICY "Users can view tasks in their workspaces" ON public.tasks
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR 
    is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Users can create tasks in their workspaces" ON public.tasks
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Users can update tasks in their workspaces" ON public.tasks
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR 
    (is_workspace_member(auth.uid(), workspace_id) AND 
     (created_by = auth.uid() OR assigned_to = auth.uid()))
  );

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR 
    created_by = auth.uid()
  );

-- Tabela: field_occurrences (observações/ocorrências de campo)
CREATE TABLE IF NOT EXISTS public.field_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  talhao_id uuid REFERENCES public.plots(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('praga', 'doenca', 'deficiencia', 'dano_climatico', 'erva_daninha', 'outro')),
  description text,
  severity text CHECK (severity IN ('baixa', 'media', 'alta', 'critica')),
  photo_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'resolved', 'escalated')),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on field_occurrences
ALTER TABLE public.field_occurrences ENABLE ROW LEVEL SECURITY;

-- Policies for field_occurrences
CREATE POLICY "Users can view occurrences in their workspaces" ON public.field_occurrences
  FOR SELECT USING (
    is_superadmin(auth.uid()) OR 
    is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Users can create occurrences in their workspaces" ON public.field_occurrences
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    is_workspace_member(auth.uid(), workspace_id)
  );

CREATE POLICY "Users can update occurrences in their workspaces" ON public.field_occurrences
  FOR UPDATE USING (
    is_superadmin(auth.uid()) OR 
    (is_workspace_member(auth.uid(), workspace_id) AND created_by = auth.uid())
  );

CREATE POLICY "Users can delete own occurrences" ON public.field_occurrences
  FOR DELETE USING (
    is_superadmin(auth.uid()) OR 
    created_by = auth.uid()
  );

-- Trigger para updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_field_occurrences_updated_at
  BEFORE UPDATE ON public.field_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_tasks_workspace_id ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

CREATE INDEX idx_field_occurrences_workspace_id ON public.field_occurrences(workspace_id);
CREATE INDEX idx_field_occurrences_category ON public.field_occurrences(category);
CREATE INDEX idx_field_occurrences_status ON public.field_occurrences(status);