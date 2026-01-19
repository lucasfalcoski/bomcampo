/**
 * Hook for user management operations (superadmin)
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperadmin } from './useSuperadmin';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkspaceRole = Database['public']['Enums']['workspace_role'];

export interface WorkspaceInvite {
  id: string;
  email: string;
  workspace_id: string;
  workspace_name?: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invited_by_user_id: string;
  sent_at: string;
  last_resent_at: string | null;
  accepted_at: string | null;
  expires_at: string | null;
}

export interface ExtendedAdminUser {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  workspace_id?: string;
  workspace_name?: string;
  workspace_role?: string;
  system_role?: string;
  is_suspended?: boolean;
  has_pending_invite?: boolean;
}

export function useUserManagement() {
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Create new user invite
  const createUserInvite = useCallback(async (
    email: string,
    workspaceId: string,
    role: WorkspaceRole,
    nome?: string
  ) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      // Check if user already exists
      const { data: existingUserId } = await supabase.rpc('find_user_by_email', { _email: email });
      
      if (existingUserId) {
        // User exists, add to workspace directly
        const { error } = await supabase
          .from('workspace_members')
          .upsert({
            user_id: existingUserId,
            workspace_id: workspaceId,
            role,
          });

        if (error) throw error;

        await logAudit('add_to_workspace', 'user', existingUserId, null, { workspaceId, role });
        toast({ title: 'Usuário adicionado ao workspace' });
        return true;
      }

      // User doesn't exist, create invite
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: inviteError } = await supabase
        .from('workspace_invites')
        .insert({
          email,
          workspace_id: workspaceId,
          role,
          invited_by_user_id: user!.id,
        });

      if (inviteError) throw inviteError;

      // Send invite email via Supabase Auth
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: { nome: nome || email.split('@')[0] },
        },
      });

      // Note: This will send a magic link. In production, you might want a custom invite flow.

      await logAudit('create_invite', 'workspace_invite', null, null, { email, workspaceId, role });
      toast({ title: 'Convite enviado', description: `Email enviado para ${email}` });
      return true;
    } catch (err: any) {
      console.error('[createUserInvite] Error:', err);
      toast({ 
        title: 'Erro ao enviar convite', 
        description: err.message || 'Tente novamente',
        variant: 'destructive' 
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Resend invite
  const resendInvite = useCallback(async (inviteId: string, email: string) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      // Update last_resent_at
      await supabase
        .from('workspace_invites')
        .update({ last_resent_at: new Date().toISOString() })
        .eq('id', inviteId);

      // Resend magic link
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      await logAudit('resend_invite', 'workspace_invite', inviteId);
      toast({ title: 'Convite reenviado' });
      return true;
    } catch (err: any) {
      console.error('[resendInvite] Error:', err);
      toast({ title: 'Erro ao reenviar convite', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Cancel invite
  const cancelInvite = useCallback(async (inviteId: string) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      await supabase
        .from('workspace_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      await logAudit('cancel_invite', 'workspace_invite', inviteId);
      toast({ title: 'Convite cancelado' });
      return true;
    } catch (err: any) {
      console.error('[cancelInvite] Error:', err);
      toast({ title: 'Erro ao cancelar convite', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Send password reset
  const sendPasswordReset = useCallback(async (email: string, userId?: string) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      await logAudit('send_password_reset', 'user', userId);
      toast({ title: 'Link de redefinição enviado', description: `Email enviado para ${email}` });
      return true;
    } catch (err: any) {
      console.error('[sendPasswordReset] Error:', err);
      toast({ title: 'Erro ao enviar link', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Suspend/reactivate user
  const toggleUserSuspension = useCallback(async (userId: string, suspend: boolean) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_suspended: suspend })
        .eq('id', userId);

      if (error) throw error;

      await logAudit(suspend ? 'suspend_user' : 'reactivate_user', 'user', userId);
      toast({ title: suspend ? 'Usuário suspenso' : 'Usuário reativado' });
      return true;
    } catch (err: any) {
      console.error('[toggleUserSuspension] Error:', err);
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Remove from workspace
  const removeFromWorkspace = useCallback(async (userId: string, workspaceId: string) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      await logAudit('remove_from_workspace', 'user', userId, { workspaceId });
      toast({ title: 'Usuário removido do workspace' });
      return true;
    } catch (err: any) {
      console.error('[removeFromWorkspace] Error:', err);
      toast({ title: 'Erro ao remover usuário', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Reset AI usage for today (testing/support)
  const resetAIUsageToday = useCallback(async (userId: string, workspaceId?: string) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      // Get today in BRT
      const now = new Date();
      const brtOffset = -3 * 60; // BRT is UTC-3
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const brtTime = new Date(utcTime + brtOffset * 60000);
      const today = brtTime.toISOString().split('T')[0];

      // Delete usage records for today
      let query = supabase
        .from('ai_usage_log')
        .delete()
        .eq('user_id', userId)
        .eq('day', today);

      if (workspaceId) {
        query = query.eq('workspace_id', workspaceId);
      }

      const { error } = await query;
      if (error) throw error;

      await logAudit('reset_ai_usage', 'user', userId, null, { day: today, workspaceId });
      toast({ title: 'Consumo de IA resetado', description: `Consultas do dia ${today} zeradas` });
      return true;
    } catch (err: unknown) {
      console.error('[resetAIUsageToday] Error:', err);
      toast({ title: 'Erro ao resetar consumo', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // Load pending invites
  const loadInvites = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoadingInvites(true);

    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select(`
          id,
          email,
          workspace_id,
          role,
          status,
          invited_by_user_id,
          sent_at,
          last_resent_at,
          accepted_at,
          expires_at
        `)
        .eq('status', 'pending')
        .order('sent_at', { ascending: false });

      if (error) throw error;

      // Get workspace names
      const invitesWithNames: WorkspaceInvite[] = [];
      for (const invite of data || []) {
        const { data: ws } = await supabase
          .from('workspaces')
          .select('name')
          .eq('id', invite.workspace_id)
          .single();

        invitesWithNames.push({
          ...invite,
          workspace_name: ws?.name,
        } as WorkspaceInvite);
      }

      setInvites(invitesWithNames);
    } catch (err) {
      console.error('[loadInvites] Error:', err);
    } finally {
      setLoadingInvites(false);
    }
  }, [isSuperadmin]);

  return {
    loading,
    invites,
    loadingInvites,
    createUserInvite,
    resendInvite,
    cancelInvite,
    sendPasswordReset,
    toggleUserSuspension,
    removeFromWorkspace,
    resetAIUsageToday,
    loadInvites,
  };
}
