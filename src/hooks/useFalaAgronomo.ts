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
    if (!conversation || !content.trim()) return false;

    setSending(true);
    
    const { error } = await supabase
      .from('fala_agronomo_message')
      .insert({
        conversation_id: conversation.id,
        sender_type: 'user',
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
  }, [conversation, refreshMessages, toast]);

  // Initialize
  useEffect(() => {
    async function init() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const userProfile = await loadProfile();
      if (!userProfile) {
        setLoading(false);
        return;
      }
      setProfile(userProfile);

      if (userProfile.partner_id) {
        const partnerData = await loadPartner(userProfile.partner_id);
        setPartner(partnerData);
      }

      const conv = await loadOrCreateConversation(userProfile);
      if (conv) {
        setConversation(conv);
        const msgs = await loadMessages(conv.id);
        setMessages(msgs);
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
