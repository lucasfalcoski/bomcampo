-- ========== POPs (Procedimentos Operacionais Padrão) ==========

-- Tabela principal de POPs
CREATE TABLE public.pops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  summary text,
  keywords text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

-- Tabela de passos do POP
CREATE TABLE public.pop_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pop_id uuid NOT NULL REFERENCES public.pops(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  step_title text,
  step_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pop_id, step_order)
);

-- Trigger para updated_at
CREATE TRIGGER update_pops_updated_at
  BEFORE UPDATE ON public.pops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pop_steps ENABLE ROW LEVEL SECURITY;

-- ========== RLS POLICIES: pops ==========

-- SELECT: POPs globais (workspace_id NULL) OU membro do workspace OU superadmin
CREATE POLICY "Users can view global or workspace POPs"
  ON public.pops
  FOR SELECT
  USING (
    is_superadmin(auth.uid()) OR
    workspace_id IS NULL OR
    is_workspace_member(auth.uid(), workspace_id)
  );

-- INSERT: POPs globais só superadmin, POPs de workspace só owner/manager ou superadmin
CREATE POLICY "Superadmin or workspace admin can insert POPs"
  ON public.pops
  FOR INSERT
  WITH CHECK (
    CASE 
      WHEN workspace_id IS NULL THEN is_superadmin(auth.uid())
      ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), workspace_id)
    END
  );

-- UPDATE: mesma lógica do INSERT
CREATE POLICY "Superadmin or workspace admin can update POPs"
  ON public.pops
  FOR UPDATE
  USING (
    CASE 
      WHEN workspace_id IS NULL THEN is_superadmin(auth.uid())
      ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), workspace_id)
    END
  );

-- DELETE: mesma lógica
CREATE POLICY "Superadmin or workspace admin can delete POPs"
  ON public.pops
  FOR DELETE
  USING (
    CASE 
      WHEN workspace_id IS NULL THEN is_superadmin(auth.uid())
      ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), workspace_id)
    END
  );

-- ========== RLS POLICIES: pop_steps ==========

-- SELECT: se pode ver o POP pai
CREATE POLICY "Users can view steps of visible POPs"
  ON public.pop_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pops p
      WHERE p.id = pop_steps.pop_id
        AND (
          is_superadmin(auth.uid()) OR
          p.workspace_id IS NULL OR
          is_workspace_member(auth.uid(), p.workspace_id)
        )
    )
  );

-- INSERT: se pode editar o POP pai
CREATE POLICY "Authorized users can insert POP steps"
  ON public.pop_steps
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pops p
      WHERE p.id = pop_steps.pop_id
        AND (
          CASE 
            WHEN p.workspace_id IS NULL THEN is_superadmin(auth.uid())
            ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), p.workspace_id)
          END
        )
    )
  );

-- UPDATE: mesma lógica
CREATE POLICY "Authorized users can update POP steps"
  ON public.pop_steps
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pops p
      WHERE p.id = pop_steps.pop_id
        AND (
          CASE 
            WHEN p.workspace_id IS NULL THEN is_superadmin(auth.uid())
            ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), p.workspace_id)
          END
        )
    )
  );

-- DELETE: mesma lógica
CREATE POLICY "Authorized users can delete POP steps"
  ON public.pop_steps
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pops p
      WHERE p.id = pop_steps.pop_id
        AND (
          CASE 
            WHEN p.workspace_id IS NULL THEN is_superadmin(auth.uid())
            ELSE is_superadmin(auth.uid()) OR is_workspace_admin(auth.uid(), p.workspace_id)
          END
        )
    )
  );

-- Índices para performance
CREATE INDEX idx_pops_workspace_id ON public.pops(workspace_id);
CREATE INDEX idx_pops_category ON public.pops(category);
CREATE INDEX idx_pops_is_active ON public.pops(is_active);
CREATE INDEX idx_pop_steps_pop_id ON public.pop_steps(pop_id);