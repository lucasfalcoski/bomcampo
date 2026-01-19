/**
 * Hook for managing action drafts in the AI Copilot
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ActionType = Database['public']['Enums']['action_type'];
type ActionDraftStatus = Database['public']['Enums']['action_draft_status'];

export interface ActionDraft {
  id: string;
  workspace_id: string | null;
  farm_id: string | null;
  created_by_user_id: string;
  action_type: ActionType;
  status: ActionDraftStatus;
  draft_json: Record<string, unknown>;
  missing_fields: string[];
  source: string;
  reviewer_user_id: string | null;
  reviewer_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActionFlow {
  mode: 'none' | 'collecting' | 'confirming' | 'awaiting_review';
  draft_id?: string;
  action_type?: string;
  next_question?: string;
  missing_fields?: string[];
  summary_preview?: string;
  ui_buttons?: string[];
}

// Required fields for each action type
const ACTION_REQUIRED_FIELDS: Record<ActionType, string[]> = {
  create_planting: ['plot_id', 'crop_id', 'data_plantio'],
  create_activity: ['plot_id', 'tipo', 'data'],
  create_occurrence: ['plot_id', 'tipo', 'descricao', 'data'],
  schedule_task: ['plot_id', 'tipo', 'data', 'responsavel'],
  update_planting_stage: ['planting_id', 'stage'],
  log_weather_event: ['farm_id', 'tipo', 'data'],
};

// Human-readable labels for fields
const FIELD_LABELS: Record<string, string> = {
  plot_id: 'Talhão',
  crop_id: 'Cultura',
  farm_id: 'Fazenda',
  planting_id: 'Plantio',
  data_plantio: 'Data de plantio',
  data: 'Data',
  tipo: 'Tipo',
  descricao: 'Descrição',
  responsavel: 'Responsável',
  stage: 'Estágio',
};

export function useActionDrafts(workspaceId?: string, farmId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentDraft, setCurrentDraft] = useState<ActionDraft | null>(null);
  const [actionFlow, setActionFlow] = useState<ActionFlow>({ mode: 'none' });
  const [loading, setLoading] = useState(false);

  // Check which fields are missing from the draft
  const getMissingFields = useCallback((actionType: ActionType, draftJson: Record<string, unknown>): string[] => {
    const required = ACTION_REQUIRED_FIELDS[actionType] || [];
    return required.filter(field => !draftJson[field]);
  }, []);

  // Create a new draft
  const createDraft = useCallback(async (
    actionType: ActionType,
    initialData: Record<string, unknown> = {}
  ): Promise<ActionDraft | null> => {
    if (!user) return null;
    setLoading(true);

    try {
      const missingFields = getMissingFields(actionType, initialData);

      const insertData = {
        workspace_id: workspaceId || null,
        farm_id: farmId || null,
        created_by_user_id: user.id,
        action_type: actionType,
        status: (missingFields.length > 0 ? 'collecting' : 'ready') as ActionDraftStatus,
        draft_json: initialData as unknown as Record<string, never>,
        missing_fields: missingFields,
        source: 'ai_chat',
      };

      const { data, error } = await supabase
        .from('action_drafts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      const draft = data as unknown as ActionDraft;
      setCurrentDraft(draft);
      setActionFlow({
        mode: missingFields.length > 0 ? 'collecting' : 'confirming',
        draft_id: draft.id,
        action_type: actionType,
        missing_fields: missingFields,
        next_question: missingFields.length > 0 
          ? `Por favor, informe: ${FIELD_LABELS[missingFields[0]] || missingFields[0]}`
          : undefined,
        summary_preview: generateSummary(actionType, initialData),
        ui_buttons: missingFields.length > 0 
          ? ['cancel', 'open_full_form']
          : ['confirm', 'edit', 'cancel', 'send_to_agronomist'],
      });

      return draft;
    } catch (err) {
      console.error('[useActionDrafts] Create error:', err);
      toast({ title: 'Erro ao criar rascunho', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, workspaceId, farmId, getMissingFields, toast]);

  // Update draft with new data
  const updateDraft = useCallback(async (
    draftId: string,
    newData: Record<string, unknown>
  ): Promise<ActionDraft | null> => {
    setLoading(true);

    try {
      // Get current draft
      const { data: current, error: fetchError } = await supabase
        .from('action_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (fetchError) throw fetchError;

      const currentDraftData = current as unknown as ActionDraft;
      const mergedData = { ...currentDraftData.draft_json, ...newData };
      const missingFields = getMissingFields(currentDraftData.action_type, mergedData);

      const updateData = {
        draft_json: mergedData as unknown as Record<string, never>,
        missing_fields: missingFields,
        status: (missingFields.length > 0 ? 'collecting' : 'ready') as ActionDraftStatus,
      };

      const { data, error } = await supabase
        .from('action_drafts')
        .update(updateData)
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;

      const draft = data as unknown as ActionDraft;
      setCurrentDraft(draft);
      setActionFlow({
        mode: missingFields.length > 0 ? 'collecting' : 'confirming',
        draft_id: draft.id,
        action_type: draft.action_type,
        missing_fields: missingFields,
        next_question: missingFields.length > 0 
          ? `Por favor, informe: ${FIELD_LABELS[missingFields[0]] || missingFields[0]}`
          : undefined,
        summary_preview: generateSummary(draft.action_type, mergedData),
        ui_buttons: missingFields.length > 0 
          ? ['cancel', 'open_full_form']
          : ['confirm', 'edit', 'cancel', 'send_to_agronomist'],
      });

      return draft;
    } catch (err) {
      console.error('[useActionDrafts] Update error:', err);
      toast({ title: 'Erro ao atualizar rascunho', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [getMissingFields, toast]);

  // Send draft to agronomist for review
  const sendToAgronomist = useCallback(async (draftId: string): Promise<boolean> => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('action_drafts')
        .update({ status: 'awaiting_review' })
        .eq('id', draftId);

      if (error) throw error;

      setActionFlow({
        mode: 'awaiting_review',
        draft_id: draftId,
        ui_buttons: ['cancel'],
      });

      toast({ title: 'Rascunho enviado ao agrônomo para revisão' });
      return true;
    } catch (err) {
      console.error('[useActionDrafts] Send to agronomist error:', err);
      toast({ title: 'Erro ao enviar para revisão', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Cancel draft
  const cancelDraft = useCallback(async (draftId: string): Promise<boolean> => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('action_drafts')
        .update({ status: 'cancelled' })
        .eq('id', draftId);

      if (error) throw error;

      setCurrentDraft(null);
      setActionFlow({ mode: 'none' });
      return true;
    } catch (err) {
      console.error('[useActionDrafts] Cancel error:', err);
      toast({ title: 'Erro ao cancelar', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Confirm and execute the action (this just marks as confirmed, actual creation uses existing CRUD)
  const confirmDraft = useCallback(async (draftId: string): Promise<ActionDraft | null> => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('action_drafts')
        .update({ status: 'confirmed' })
        .eq('id', draftId)
        .select()
        .single();

      if (error) throw error;

      const draft = data as unknown as ActionDraft;
      setCurrentDraft(null);
      setActionFlow({ mode: 'none' });
      
      toast({ title: 'Ação confirmada! Redirecionando para o formulário...' });
      return draft;
    } catch (err) {
      console.error('[useActionDrafts] Confirm error:', err);
      toast({ title: 'Erro ao confirmar', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load a draft by ID
  const loadDraft = useCallback(async (draftId: string): Promise<ActionDraft | null> => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('action_drafts')
        .select('*')
        .eq('id', draftId)
        .single();

      if (error) throw error;

      const draft = data as unknown as ActionDraft;
      setCurrentDraft(draft);

      const missingFields = getMissingFields(draft.action_type, draft.draft_json);
      setActionFlow({
        mode: draft.status === 'awaiting_review' 
          ? 'awaiting_review' 
          : missingFields.length > 0 ? 'collecting' : 'confirming',
        draft_id: draft.id,
        action_type: draft.action_type,
        missing_fields: missingFields,
        summary_preview: generateSummary(draft.action_type, draft.draft_json),
        ui_buttons: draft.status === 'awaiting_review'
          ? ['cancel']
          : missingFields.length > 0 
            ? ['cancel', 'open_full_form']
            : ['confirm', 'edit', 'cancel', 'send_to_agronomist'],
      });

      return draft;
    } catch (err) {
      console.error('[useActionDrafts] Load error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getMissingFields]);

  // Clear current action flow
  const clearActionFlow = useCallback(() => {
    setCurrentDraft(null);
    setActionFlow({ mode: 'none' });
  }, []);

  return {
    currentDraft,
    actionFlow,
    loading,
    createDraft,
    updateDraft,
    sendToAgronomist,
    cancelDraft,
    confirmDraft,
    loadDraft,
    clearActionFlow,
  };
}

// Generate a human-readable summary of the action
function generateSummary(actionType: ActionType, data: Record<string, unknown>): string {
  const summaries: Record<ActionType, () => string> = {
    create_planting: () => `Criar plantio${data.data_plantio ? ` em ${data.data_plantio}` : ''}`,
    create_activity: () => `Registrar atividade${data.tipo ? ` de ${data.tipo}` : ''}${data.data ? ` para ${data.data}` : ''}`,
    create_occurrence: () => `Registrar ocorrência${data.tipo ? ` de ${data.tipo}` : ''}`,
    schedule_task: () => `Agendar tarefa${data.tipo ? ` de ${data.tipo}` : ''}${data.data ? ` para ${data.data}` : ''}`,
    update_planting_stage: () => `Atualizar estágio${data.stage ? ` para ${data.stage}` : ''}`,
    log_weather_event: () => `Registrar evento climático${data.tipo ? `: ${data.tipo}` : ''}`,
  };

  return summaries[actionType]?.() || 'Ação';
}

// Hook for agronomist to review drafts
export function useAgronomistDraftReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pendingDrafts, setPendingDrafts] = useState<ActionDraft[]>([]);

  const loadPendingDrafts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get farms where user is agronomist
      const { data: farmLinks } = await supabase
        .from('farm_agronomists')
        .select('farm_id')
        .eq('agronomist_user_id', user.id);

      const farmIds = farmLinks?.map(f => f.farm_id) || [];

      if (farmIds.length === 0) {
        setPendingDrafts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('action_drafts')
        .select('*')
        .in('farm_id', farmIds)
        .eq('status', 'awaiting_review')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingDrafts((data || []) as unknown as ActionDraft[]);
    } catch (err) {
      console.error('[useAgronomistDraftReview] Load error:', err);
      toast({ title: 'Erro ao carregar rascunhos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const approveDraft = useCallback(async (draftId: string, comment?: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('action_drafts')
        .update({
          status: 'approved',
          reviewer_user_id: user.id,
          reviewer_comment: comment || null,
        })
        .eq('id', draftId);

      if (error) throw error;

      toast({ title: 'Rascunho aprovado' });
      await loadPendingDrafts();
      return true;
    } catch (err) {
      console.error('[useAgronomistDraftReview] Approve error:', err);
      toast({ title: 'Erro ao aprovar', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, loadPendingDrafts, toast]);

  const rejectDraft = useCallback(async (draftId: string, comment: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('action_drafts')
        .update({
          status: 'rejected',
          reviewer_user_id: user.id,
          reviewer_comment: comment,
        })
        .eq('id', draftId);

      if (error) throw error;

      toast({ title: 'Rascunho rejeitado' });
      await loadPendingDrafts();
      return true;
    } catch (err) {
      console.error('[useAgronomistDraftReview] Reject error:', err);
      toast({ title: 'Erro ao rejeitar', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, loadPendingDrafts, toast]);

  return {
    loading,
    pendingDrafts,
    loadPendingDrafts,
    approveDraft,
    rejectDraft,
  };
}
