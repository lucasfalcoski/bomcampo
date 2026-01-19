/**
 * Hook for Fala IAgrônomo AI chat functionality
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEntitlements } from '@/hooks/useEntitlements';

interface AIAction {
  type: 'open_report' | 'open_pop' | 'create_task' | 'escalate_agronomist' | 'view_content';
  id?: string;
  payload?: Record<string, unknown>;
  label?: string;
}

interface AIResponse {
  assistant_text: string;
  actions: AIAction[];
  flags: {
    show_escalate_to_agronomist?: boolean;
    blocked_reason?: string;
    decision_route?: string;
    sources_used?: string[];
  };
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AIAction[];
  flags?: AIResponse['flags'];
  createdAt: Date;
}

interface UseIAgronomoOptions {
  workspaceId?: string;
  farmId?: string;
  plotId?: string;
}

export function useIAgronomo(options: UseIAgronomoOptions = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canUseAIFeature, quota, workspaceId: entitlementWorkspaceId } = useEntitlements({ 
    workspaceId: options.workspaceId 
  });
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const effectiveWorkspaceId = options.workspaceId || entitlementWorkspaceId;

  // Load existing conversation on mount
  useEffect(() => {
    async function loadConversation() {
      if (!user || !effectiveWorkspaceId) return;

      const { data } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('workspace_id', effectiveWorkspaceId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setConversationId(data.id);
        
        // Load messages
        const { data: msgs } = await supabase
          .from('ai_messages')
          .select('*')
          .eq('conversation_id', data.id)
          .order('created_at', { ascending: true });

        if (msgs) {
          setMessages(msgs.map(m => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            flags: m.meta_json as AIResponse['flags'] | undefined,
            createdAt: new Date(m.created_at),
          })));
        }
      }
    }

    loadConversation();
  }, [user, effectiveWorkspaceId]);

  const sendMessage = useCallback(async (
    content: string,
    photoUrl?: string
  ): Promise<boolean> => {
    if (!content.trim() && !photoUrl) {
      return false;
    }

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para usar o assistente.',
        variant: 'destructive',
      });
      return false;
    }

    // Check if user can use AI (will be validated server-side too)
    if (!canUseAIFeature && effectiveWorkspaceId) {
      toast({
        title: 'Limite atingido',
        description: 'Você atingiu o limite diário de consultas. Tente novamente amanhã.',
        variant: 'destructive',
      });
      return false;
    }

    setSending(true);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: photoUrl ? `${content}\n\n📷 [Foto anexada]` : content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Não autenticado');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-ask`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            workspace_id: effectiveWorkspaceId,
            farm_id: options.farmId,
            plot_id: options.plotId,
            user_message: content,
            photo_url: photoUrl,
            conversation_id: conversationId,
          }),
        }
      );

      if (response.status === 401) {
        toast({
          title: 'Sessão expirada',
          description: 'Por favor, faça login novamente.',
          variant: 'destructive',
        });
        return false;
      }

      if (response.status === 429) {
        toast({
          title: 'Muitas requisições',
          description: 'Aguarde alguns segundos e tente novamente.',
          variant: 'destructive',
        });
        return false;
      }

      if (response.status === 402) {
        toast({
          title: 'Créditos esgotados',
          description: 'Entre em contato com o suporte para adicionar créditos.',
          variant: 'destructive',
        });
        return false;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar resposta');
      }

      const data: AIResponse = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.assistant_text,
        actions: data.actions,
        flags: data.flags,
        createdAt: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      return true;

    } catch (error) {
      console.error('[useIAgronomo] Error:', error);
      
      // Remove the optimistic user message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      
      toast({
        title: 'Erro ao enviar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSending(false);
    }
  }, [user, effectiveWorkspaceId, options.farmId, conversationId, canUseAIFeature, toast]);

  const uploadPhoto = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione uma imagem.',
        variant: 'destructive',
      });
      return null;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo é 5MB.',
        variant: 'destructive',
      });
      return null;
    }

    setUploadingPhoto(true);

    try {
      const fileName = `ai-photos/${user.id}/${Date.now()}-${file.name}`;
      
      const { error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName);

      return urlData.publicUrl;

    } catch (error) {
      console.error('[useIAgronomo] Upload error:', error);
      toast({
        title: 'Erro ao enviar foto',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }, [user, toast]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    sending,
    uploadingPhoto,
    conversationId,
    remainingQuota: quota?.remaining,
    canUseAI: canUseAIFeature,
    sendMessage,
    uploadPhoto,
    clearHistory,
  };
}
