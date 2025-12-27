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
  
  const isB2B = Boolean(profile?.partner_id);

  const loadProfile = useCallback(async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, partner_id, nome')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading profile:', error);
      return null;
    }

    return data;
  }, [user]);

  const loadPartner = useCallback(async (partnerId: string) => {
    const { data, error } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partnerId)
      .maybeSingle();

    if (error) {
      console.error('Error loading partner:', error);
      return null;
    }

    return data;
  }, []);

  const loadOrCreateConversation = useCallback(async (userProfile: UserProfile) => {
    if (!user) return null;

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
      console.error('Error loading conversation:', selectError);
      return null;
    }

    if (existingConv) {
      return existingConv;
    }

    // Create new conversation
    const context: FalaAgronomoContext = userProfile.partner_id ? 'B2B' : 'B2C';
    
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
      console.error('Error creating conversation:', insertError);
      return null;
    }

    return newConv;
  }, [user]);

  const loadMessages = useCallback(async (conversationId: string) => {
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
  }, []);

  const refreshMessages = useCallback(async () => {
    if (!conversation) return;
    const msgs = await loadMessages(conversation.id);
    setMessages(msgs);
  }, [conversation, loadMessages]);

  const sendMessage = useCallback(async (content: string) => {
    // Validate before sending
    if (!content.trim()) {
      console.warn('sendMessage: empty content');
      return false;
    }

    if (!conversation) {
      console.error('sendMessage: no active conversation');
      toast({
        title: 'Erro',
        description: 'Não há conversa ativa. Recarregue a página.',
        variant: 'destructive'
      });
      return false;
    }

    console.log('sendMessage: sending to conversation', conversation.id);
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
      console.error('sendMessage: insert error', error);
      toast({
        title: 'Não foi possível enviar a mensagem',
        description: 'Tente novamente.',
        variant: 'destructive'
      });
      setSending(false);
      return false;
    }

    console.log('sendMessage: success', data);
    await refreshMessages();
    setSending(false);
    return true;
  }, [conversation, refreshMessages, toast]);

  // Initialize
  useEffect(() => {
    async function init() {
      if (!user) {
        console.log('useFalaAgronomo: no user, skipping init');
        setLoading(false);
        return;
      }

      console.log('useFalaAgronomo: initializing for user', user.id);
      setLoading(true);

      const userProfile = await loadProfile();
      if (!userProfile) {
        console.error('useFalaAgronomo: failed to load profile');
        setLoading(false);
        return;
      }
      console.log('useFalaAgronomo: profile loaded', { id: userProfile.id, partner_id: userProfile.partner_id });
      setProfile(userProfile);

      if (userProfile.partner_id) {
        const partnerData = await loadPartner(userProfile.partner_id);
        console.log('useFalaAgronomo: partner loaded', partnerData);
        setPartner(partnerData);
      }

      const conv = await loadOrCreateConversation(userProfile);
      if (conv) {
        console.log('useFalaAgronomo: conversation ready', conv.id);
        setConversation(conv);
        const msgs = await loadMessages(conv.id);
        console.log('useFalaAgronomo: loaded', msgs.length, 'messages');
        setMessages(msgs);
      } else {
        console.error('useFalaAgronomo: failed to get/create conversation');
      }

      setLoading(false);
    }

    init();
  }, [user, loadProfile, loadPartner, loadOrCreateConversation, loadMessages]);

  return {
    loading,
    sending,
    profile,
    partner,
    conversation,
    messages,
    isB2B,
    sendMessage,
    refreshMessages
  };
}
