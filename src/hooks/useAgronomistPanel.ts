import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['fala_agronomo_conversation']['Row'];
type Message = Database['public']['Tables']['fala_agronomo_message']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

interface ConversationWithUser extends Conversation {
  profiles?: {
    nome: string | null;
  } | null;
}

const AGRONOMIST_ROLES: AppRole[] = ['partner_agronomist', 'partner_admin', 'system_admin'];

export function useAgronomistPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);

  const checkAccess = useCallback(async () => {
    if (!user) return { hasAccess: false, partnerId: null };

    // Check if user has agronomist role
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      return { hasAccess: false, partnerId: null };
    }

    const userRoles = roles?.map(r => r.role) || [];
    const isAgronomist = userRoles.some(role => AGRONOMIST_ROLES.includes(role as AppRole));

    if (!isAgronomist) {
      return { hasAccess: false, partnerId: null };
    }

    // Get user's partner_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('partner_id')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Error loading profile:', profileError);
      return { hasAccess: false, partnerId: null };
    }

    // system_admin can see all, others need partner_id
    const isSystemAdmin = userRoles.includes('system_admin');
    
    return {
      hasAccess: isSystemAdmin || Boolean(profile?.partner_id),
      partnerId: profile?.partner_id || null,
      isSystemAdmin
    };
  }, [user]);

  const loadConversations = useCallback(async (partnerIdParam: string | null, isSystemAdmin?: boolean) => {
    let query = supabase
      .from('fala_agronomo_conversation')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    // Filter by partner unless system admin
    if (!isSystemAdmin && partnerIdParam) {
      query = query.eq('partner_id', partnerIdParam);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading conversations:', error);
      return [];
    }

    // Fetch user names separately
    const conversations = data || [];
    const userIds = [...new Set(conversations.map(c => c.user_id))];
    
    if (userIds.length === 0) return [];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p.nome]) || []);

    return conversations.map(c => ({
      ...c,
      profiles: { nome: profileMap.get(c.user_id) || null }
    })) as ConversationWithUser[];
  }, []);

  const refreshConversations = useCallback(async () => {
    const accessInfo = await checkAccess();
    if (accessInfo.hasAccess) {
      const convs = await loadConversations(accessInfo.partnerId, (accessInfo as any).isSystemAdmin);
      setConversations(convs);
    }
  }, [checkAccess, loadConversations]);

  useEffect(() => {
    async function init() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      const accessInfo = await checkAccess();
      setHasAccess(accessInfo.hasAccess);
      setPartnerId(accessInfo.partnerId);

      if (accessInfo.hasAccess) {
        const convs = await loadConversations(accessInfo.partnerId, (accessInfo as any).isSystemAdmin);
        setConversations(convs);
      }

      setLoading(false);
    }

    init();
  }, [user, checkAccess, loadConversations]);

  return {
    loading,
    hasAccess,
    partnerId,
    conversations,
    refreshConversations
  };
}

export function useConversationDetail(conversationId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationWithUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userName, setUserName] = useState<string>('');

  const loadConversation = useCallback(async () => {
    if (!conversationId) return null;

    const { data, error } = await supabase
      .from('fala_agronomo_conversation')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      console.error('Error loading conversation:', error);
      return null;
    }

    if (!data) return null;

    // Fetch user name separately
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', data.user_id)
      .maybeSingle();

    return {
      ...data,
      profiles: { nome: profile?.nome || null }
    } as ConversationWithUser;
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return [];

    const { data, error } = await supabase
      .from('fala_agronomo_message')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    return data || [];
  }, [conversationId]);

  const refreshMessages = useCallback(async () => {
    const msgs = await loadMessages();
    setMessages(msgs);
  }, [loadMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !content.trim()) return false;

    setSending(true);

    const { error } = await supabase
      .from('fala_agronomo_message')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agronomist',
        content: content.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
      setSending(false);
      return false;
    }

    await refreshMessages();
    setSending(false);
    return true;
  }, [conversationId, refreshMessages, toast]);

  const closeConversation = useCallback(async () => {
    if (!conversationId) return false;

    const { error } = await supabase
      .from('fala_agronomo_conversation')
      .update({ status: 'closed' })
      .eq('id', conversationId);

    if (error) {
      console.error('Error closing conversation:', error);
      toast({
        title: 'Erro ao encerrar conversa',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
      return false;
    }

    toast({
      title: 'Conversa encerrada',
      description: 'A conversa foi marcada como fechada.'
    });

    return true;
  }, [conversationId, toast]);

  useEffect(() => {
    async function init() {
      if (!conversationId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const conv = await loadConversation();
      if (conv) {
        setConversation(conv);
        setUserName(conv.profiles?.nome || 'Produtor');
      }

      const msgs = await loadMessages();
      setMessages(msgs);

      setLoading(false);
    }

    init();
  }, [conversationId, loadConversation, loadMessages]);

  return {
    loading,
    sending,
    conversation,
    messages,
    userName,
    sendMessage,
    refreshMessages,
    closeConversation
  };
}

interface ConversationWithUser extends Conversation {
  profiles?: {
    nome: string | null;
  } | null;
}
