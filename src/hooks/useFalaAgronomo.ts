import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Conversation = Database['public']['Tables']['fala_agronomo_conversation']['Row'];
type Message = Database['public']['Tables']['fala_agronomo_message']['Row'];
type FalaAgronomoContext = Database['public']['Enums']['fala_agronomo_context'];

interface UserProfile {
  id: string;
  partner_id: string | null;
  nome: string | null;
}

interface Partner {
  id: string;
  name: string;
}

export function useFalaAgronomo() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initError, setInitError] = useState<string | null>(null);
  
  const isB2B = Boolean(profile?.partner_id);

  // Load or create profile
  const loadOrCreateProfile = useCallback(async (): Promise<UserProfile | null> => {
    if (!user) return null;

    console.log('fala-agronomo: loading profile for user', user.id);

    // Try to load existing profile
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('id, partner_id, nome')
      .eq('id', user.id)
      .maybeSingle();

    if (selectError) {
      console.error('fala-agronomo: error loading profile', selectError);
      toast({
        title: 'Erro ao carregar perfil',
        description: selectError.message,
        variant: 'destructive'
      });
      return null;
    }

    if (existingProfile) {
      console.log('fala-agronomo: profile found', existingProfile);
      return existingProfile;
    }

    // Profile doesn't exist - create it
    console.log('fala-agronomo: profile not found, creating...');
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        nome: user.email || 'Usuário'
      })
      .select('id, partner_id, nome')
      .single();

    if (insertError) {
      console.error('fala-agronomo: error creating profile', insertError);
      toast({
        title: 'Erro ao criar perfil',
        description: insertError.message,
        variant: 'destructive'
      });
      return null;
    }

    console.log('fala-agronomo: profile created', newProfile);
    return newProfile;
  }, [user, toast]);

  // Load partner (with fallback if RLS blocks)
  const loadPartner = useCallback(async (partnerId: string): Promise<Partner | null> => {
    console.log('fala-agronomo: loading partner', partnerId);
    
    const { data, error } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partnerId)
      .maybeSingle();

    if (error) {
      console.warn('fala-agronomo: could not load partner (RLS may have blocked)', error);
      // Return a fallback partner so B2B flow still works
      return { id: partnerId, name: 'Parceiro' };
    }

    console.log('fala-agronomo: partner loaded', data);
    return data;
  }, []);

  // Load or create conversation
  const loadOrCreateConversation = useCallback(async (userProfile: UserProfile): Promise<Conversation | null> => {
    if (!user) return null;

    console.log('fala-agronomo: loading conversation for user', user.id);

    // Try to find an open conversation
    const { data: existingConv, error: selectError } = await supabase
      .from('fala_agronomo_conversation')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError) {
      console.error('fala-agronomo: error loading conversation', selectError);
      toast({
        title: 'Erro ao carregar conversa',
        description: selectError.message,
        variant: 'destructive'
      });
      return null;
    }

    if (existingConv) {
      console.log('fala-agronomo: found open conversation', existingConv.id);
      return existingConv;
    }

    // Create new conversation
    const context: FalaAgronomoContext = userProfile.partner_id ? 'B2B' : 'B2C';
    console.log('fala-agronomo: creating new conversation', { context, partner_id: userProfile.partner_id });
    
    const { data: newConv, error: insertError } = await supabase
      .from('fala_agronomo_conversation')
      .insert({
        user_id: user.id,
        partner_id: userProfile.partner_id,
        context,
        status: 'open'
      })
      .select()
      .single();

    if (insertError) {
      console.error('fala-agronomo: error creating conversation', insertError);
      toast({
        title: 'Erro ao criar conversa',
        description: insertError.message,
        variant: 'destructive'
      });
      return null;
    }

    console.log('fala-agronomo: conversation created', newConv.id);
    return newConv;
  }, [user, toast]);

  // Load messages
  const loadMessages = useCallback(async (conversationId: string): Promise<Message[]> => {
    console.log('fala-agronomo: loading messages for conversation', conversationId);
    
    const { data, error } = await supabase
      .from('fala_agronomo_message')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('fala-agronomo: error loading messages', error);
      return [];
    }

    console.log('fala-agronomo: loaded', data?.length || 0, 'messages');
    return data || [];
  }, []);

  // Refresh messages
  const refreshMessages = useCallback(async () => {
    if (!conversation) return;
    const msgs = await loadMessages(conversation.id);
    setMessages(msgs);
  }, [conversation, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    // Validate content
    if (!content.trim()) {
      console.warn('fala-agronomo: empty message, not sending');
      return false;
    }

    // Validate conversation exists
    if (!conversation) {
      console.error('fala-agronomo: no conversation, cannot send');
      toast({
        title: 'Erro',
        description: 'Nenhuma conversa ativa. Recarregue a página.',
        variant: 'destructive'
      });
      return false;
    }

    console.log('fala-agronomo: sending message to conversation', conversation.id);
    setSending(true);
    
    const { data, error } = await supabase
      .from('fala_agronomo_message')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'user',
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('fala-agronomo: error sending message', error);
      toast({
        title: 'Não foi possível enviar a mensagem',
        description: error.message,
        variant: 'destructive'
      });
      setSending(false);
      return false;
    }

    console.log('fala-agronomo: message sent', data.id);
    await refreshMessages();
    setSending(false);
    return true;
  }, [conversation, refreshMessages, toast]);

  // Initialize
  useEffect(() => {
    async function init() {
      if (!user) {
        console.log('fala-agronomo: no user, skipping init');
        setLoading(false);
        return;
      }

      console.log('fala-agronomo: ===== INIT START =====');
      setLoading(true);
      setInitError(null);

      // Step 1: Load or create profile
      const userProfile = await loadOrCreateProfile();
      if (!userProfile) {
        console.error('fala-agronomo: failed to get profile');
        setInitError('Erro ao carregar perfil do usuário');
        setLoading(false);
        return;
      }
      console.log('fala-agronomo: profile ready', { id: userProfile.id, partner_id: userProfile.partner_id });
      setProfile(userProfile);

      // Step 2: Load partner if B2B
      if (userProfile.partner_id) {
        const partnerData = await loadPartner(userProfile.partner_id);
        if (partnerData) {
          setPartner(partnerData);
        }
      }

      // Step 3: Load or create conversation
      const conv = await loadOrCreateConversation(userProfile);
      if (!conv) {
        console.error('fala-agronomo: failed to get conversation');
        setInitError('Erro ao iniciar conversa');
        setLoading(false);
        return;
      }
      console.log('fala-agronomo: conversation ready', conv.id);
      setConversation(conv);

      // Step 4: Load messages
      const msgs = await loadMessages(conv.id);
      setMessages(msgs);

      console.log('fala-agronomo: ===== INIT COMPLETE =====');
      setLoading(false);
    }

    init();
  }, [user, loadOrCreateProfile, loadPartner, loadOrCreateConversation, loadMessages]);

  return {
    loading,
    sending,
    profile,
    partner,
    conversation,
    messages,
    isB2B,
    initError,
    sendMessage,
    refreshMessages
  };
}
