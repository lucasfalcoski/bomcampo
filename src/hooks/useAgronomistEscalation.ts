/**
 * Hook to manage escalation to human agronomist
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface LinkedAgronomist {
  agronomist_user_id: string;
  is_primary: boolean;
  farm_id: string;
  farm_name?: string;
}

interface EscalationOptions {
  farmId?: string;
  workspaceId?: string;
}

export function useAgronomistEscalation(options: EscalationOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [linkedAgronomists, setLinkedAgronomists] = useState<LinkedAgronomist[]>([]);
  const [sending, setSending] = useState(false);
  const [userFarms, setUserFarms] = useState<{ id: string; nome: string }[]>([]);

  // Load user's farms and check for linked agronomists
  useEffect(() => {
    async function loadData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's farms
        const { data: farms } = await supabase
          .from('farms')
          .select('id, nome')
          .eq('user_id', user.id);

        if (farms && farms.length > 0) {
          setUserFarms(farms);

          // Get linked agronomists for these farms
          const farmIds = farms.map(f => f.id);
          const { data: agronomists } = await supabase
            .from('farm_agronomists')
            .select('agronomist_user_id, is_primary, farm_id')
            .in('farm_id', farmIds);

          if (agronomists && agronomists.length > 0) {
            // Map farm names to agronomists
            const agronomistsWithFarmNames = agronomists.map(a => ({
              ...a,
              farm_name: farms.find(f => f.id === a.farm_id)?.nome
            }));
            setLinkedAgronomists(agronomistsWithFarmNames);
          }
        }
      } catch (err) {
        console.error('[useAgronomistEscalation] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const hasLinkedAgronomist = linkedAgronomists.length > 0;

  const sendToAgronomist = useCallback(async (
    question: string,
    context?: {
      aiResponse?: string;
      farmId?: string;
      plot_id?: string;
      cultura?: string;
      estagio?: string;
    }
  ): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado.',
        variant: 'destructive',
      });
      return false;
    }

    if (!hasLinkedAgronomist) {
      toast({
        title: 'Sem agrônomo vinculado',
        description: 'Não há agrônomo vinculado às suas fazendas.',
        variant: 'destructive',
      });
      return false;
    }

    setSending(true);

    try {
      // Determine farm_id - use provided, or first farm with linked agronomist
      let farmId = context?.farmId || options.farmId;
      if (!farmId && linkedAgronomists.length > 0) {
        farmId = linkedAgronomists[0].farm_id;
      }

      // Get workspace_id from farm
      let workspaceId = options.workspaceId;
      if (!workspaceId && farmId) {
        const { data: farm } = await supabase
          .from('farms')
          .select('workspace_id')
          .eq('id', farmId)
          .single();
        workspaceId = farm?.workspace_id || undefined;
      }

      // Build context JSON with all available info
      const contextJson: Record<string, string | undefined> = {};
      if (context?.aiResponse) contextJson.ai_response = context.aiResponse;
      if (context?.plot_id) contextJson.plot_id = context.plot_id;
      if (context?.cultura) contextJson.cultura = context.cultura;
      if (context?.estagio) contextJson.estagio = context.estagio;

      // Create agro_question
      const { error } = await supabase
        .from('agro_questions')
        .insert([{
          asked_by_user_id: user.id,
          question,
          farm_id: farmId || null,
          workspace_id: workspaceId || null,
          context_json: Object.keys(contextJson).length > 0 ? contextJson : null,
          status: 'open' as const,
        }]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Pergunta enviada',
        description: 'Sua pergunta foi enviada ao agrônomo. Você receberá a resposta em breve.',
      });

      return true;
    } catch (err) {
      console.error('[useAgronomistEscalation] Error sending question:', err);
      toast({
        title: 'Erro ao enviar',
        description: 'Não foi possível enviar a pergunta. Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSending(false);
    }
  }, [user, hasLinkedAgronomist, linkedAgronomists, options.farmId, options.workspaceId, toast]);

  return {
    loading,
    hasLinkedAgronomist,
    linkedAgronomists,
    userFarms,
    sending,
    sendToAgronomist,
  };
}
