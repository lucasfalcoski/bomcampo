/**
 * Hooks for B2B workspace panel management
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type WorkspaceRole = Database['public']['Enums']['workspace_role'];
type WorkspacePlan = Database['public']['Enums']['workspace_plan'];

export interface WorkspaceMember {
  user_id: string;
  email: string;
  nome: string | null;
  role: WorkspaceRole;
  created_at: string;
}

export interface WorkspaceInfo {
  id: string;
  name: string;
  plan: WorkspacePlan;
  type: 'b2c' | 'b2b';
  status: string;
}

export interface FarmWithAgronomists {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  area_ha: number | null;
  agronomist_count: number;
}

export interface FarmAgronomist {
  agronomist_user_id: string;
  email: string;
  nome: string | null;
  is_primary: boolean;
  channel_pref: Database['public']['Enums']['channel_preference'];
}

export interface AIUsageDay {
  day: string;
  requests: number;
  tokens_in: number;
  tokens_out: number;
  source: string;
}

// Hook to get current user's workspace and role
export function useCurrentWorkspace() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if superadmin
        const { data: systemRole } = await supabase
          .from('user_system_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (systemRole?.role === 'superadmin') {
          setIsSuperadmin(true);
          setIsAdmin(true);
        }

        // Get workspace membership
        const { data: membership } = await supabase
          .from('workspace_members')
          .select('workspace_id, role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (membership) {
          setRole(membership.role);
          setIsAdmin(membership.role === 'owner' || membership.role === 'manager' || systemRole?.role === 'superadmin');

          // Get workspace info
          const { data: ws } = await supabase
            .from('workspaces')
            .select('id, name, plan, type, status')
            .eq('id', membership.workspace_id)
            .single();

          if (ws) {
            setWorkspace({
              id: ws.id,
              name: ws.name,
              plan: ws.plan,
              type: ws.type as 'b2c' | 'b2b',
              status: ws.status,
            });
          }
        }
      } catch (err) {
        console.error('[useCurrentWorkspace] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  return { loading, workspace, role, isAdmin, isSuperadmin };
}

// Hook to manage workspace members
export function useWorkspaceMembers(workspaceId: string | undefined) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);

    try {
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select('user_id, role, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles and emails
      const userIds = memberships?.map(m => m.user_id) || [];
      const membersWithInfo: WorkspaceMember[] = [];

      for (const m of memberships || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', m.user_id)
          .maybeSingle();

        const { data: email } = await supabase.rpc('get_user_email', { _user_id: m.user_id });

        membersWithInfo.push({
          user_id: m.user_id,
          email: email || '',
          nome: profile?.nome || null,
          role: m.role,
          created_at: m.created_at,
        });
      }

      setMembers(membersWithInfo);
    } catch (err) {
      console.error('[useWorkspaceMembers] Error:', err);
      toast({ title: 'Erro ao carregar membros', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  const addMember = useCallback(async (email: string, role: WorkspaceRole) => {
    if (!workspaceId) return false;

    try {
      // Find user by email
      const { data: userId, error: findError } = await supabase.rpc('find_user_by_email', { _email: email });

      if (findError || !userId) {
        toast({ title: 'Usuário não encontrado', description: 'Verifique o email informado.', variant: 'destructive' });
        return false;
      }

      // Check if already member
      const existing = members.find(m => m.user_id === userId);
      if (existing) {
        toast({ title: 'Usuário já é membro', variant: 'destructive' });
        return false;
      }

      const { error } = await supabase
        .from('workspace_members')
        .insert({ workspace_id: workspaceId, user_id: userId, role });

      if (error) throw error;

      toast({ title: 'Membro adicionado com sucesso' });
      await loadMembers();
      return true;
    } catch (err) {
      console.error('[addMember] Error:', err);
      toast({ title: 'Erro ao adicionar membro', variant: 'destructive' });
      return false;
    }
  }, [workspaceId, members, loadMembers, toast]);

  const updateMemberRole = useCallback(async (userId: string, role: WorkspaceRole) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Role atualizada' });
      await loadMembers();
      return true;
    } catch (err) {
      console.error('[updateMemberRole] Error:', err);
      toast({ title: 'Erro ao atualizar role', variant: 'destructive' });
      return false;
    }
  }, [workspaceId, loadMembers, toast]);

  const removeMember = useCallback(async (userId: string) => {
    if (!workspaceId) return false;

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

      if (error) throw error;

      toast({ title: 'Membro removido' });
      await loadMembers();
      return true;
    } catch (err) {
      console.error('[removeMember] Error:', err);
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
      return false;
    }
  }, [workspaceId, loadMembers, toast]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  return { loading, members, addMember, updateMemberRole, removeMember, refresh: loadMembers };
}

// Hook to manage workspace farms
export function useWorkspaceFarms(workspaceId: string | undefined) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<FarmWithAgronomists[]>([]);

  const loadFarms = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('farms')
        .select('id, nome, cidade, estado, area_ha')
        .eq('workspace_id', workspaceId)
        .order('nome');

      if (error) throw error;

      // Get agronomist counts
      const farmIds = data?.map(f => f.id) || [];
      const farmsWithCounts: FarmWithAgronomists[] = [];

      for (const farm of data || []) {
        const { count } = await supabase
          .from('farm_agronomists')
          .select('*', { count: 'exact', head: true })
          .eq('farm_id', farm.id);

        farmsWithCounts.push({
          ...farm,
          agronomist_count: count || 0,
        });
      }

      setFarms(farmsWithCounts);
    } catch (err) {
      console.error('[useWorkspaceFarms] Error:', err);
      toast({ title: 'Erro ao carregar fazendas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [workspaceId, toast]);

  useEffect(() => {
    loadFarms();
  }, [loadFarms]);

  return { loading, farms, refresh: loadFarms };
}

// Hook to manage farm agronomists
export function useFarmAgronomists(farmId: string | undefined) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [agronomists, setAgronomists] = useState<FarmAgronomist[]>([]);

  const loadAgronomists = useCallback(async () => {
    if (!farmId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('farm_agronomists')
        .select('agronomist_user_id, is_primary, channel_pref')
        .eq('farm_id', farmId);

      if (error) throw error;

      const agrosWithInfo: FarmAgronomist[] = [];

      for (const a of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', a.agronomist_user_id)
          .maybeSingle();

        const { data: email } = await supabase.rpc('get_user_email', { _user_id: a.agronomist_user_id });

        agrosWithInfo.push({
          agronomist_user_id: a.agronomist_user_id,
          email: email || '',
          nome: profile?.nome || null,
          is_primary: a.is_primary,
          channel_pref: a.channel_pref,
        });
      }

      setAgronomists(agrosWithInfo);
    } catch (err) {
      console.error('[useFarmAgronomists] Error:', err);
      toast({ title: 'Erro ao carregar agrônomos', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [farmId, toast]);

  const addAgronomist = useCallback(async (email: string, isPrimary: boolean = false) => {
    if (!farmId) return false;

    try {
      const { data: userId, error: findError } = await supabase.rpc('find_user_by_email', { _email: email });

      if (findError || !userId) {
        toast({ title: 'Usuário não encontrado', variant: 'destructive' });
        return false;
      }

      // If setting as primary, unset others
      if (isPrimary) {
        await supabase
          .from('farm_agronomists')
          .update({ is_primary: false })
          .eq('farm_id', farmId);
      }

      const { error } = await supabase
        .from('farm_agronomists')
        .upsert({ 
          farm_id: farmId, 
          agronomist_user_id: userId, 
          is_primary: isPrimary,
          channel_pref: 'panel' 
        });

      if (error) throw error;

      toast({ title: 'Agrônomo vinculado' });
      await loadAgronomists();
      return true;
    } catch (err) {
      console.error('[addAgronomist] Error:', err);
      toast({ title: 'Erro ao vincular agrônomo', variant: 'destructive' });
      return false;
    }
  }, [farmId, loadAgronomists, toast]);

  const removeAgronomist = useCallback(async (userId: string) => {
    if (!farmId) return false;

    try {
      const { error } = await supabase
        .from('farm_agronomists')
        .delete()
        .eq('farm_id', farmId)
        .eq('agronomist_user_id', userId);

      if (error) throw error;

      toast({ title: 'Agrônomo removido' });
      await loadAgronomists();
      return true;
    } catch (err) {
      console.error('[removeAgronomist] Error:', err);
      toast({ title: 'Erro ao remover agrônomo', variant: 'destructive' });
      return false;
    }
  }, [farmId, loadAgronomists, toast]);

  const setPrimary = useCallback(async (userId: string) => {
    if (!farmId) return false;

    try {
      // Unset all
      await supabase
        .from('farm_agronomists')
        .update({ is_primary: false })
        .eq('farm_id', farmId);

      // Set primary
      const { error } = await supabase
        .from('farm_agronomists')
        .update({ is_primary: true })
        .eq('farm_id', farmId)
        .eq('agronomist_user_id', userId);

      if (error) throw error;

      toast({ title: 'Agrônomo primário definido' });
      await loadAgronomists();
      return true;
    } catch (err) {
      console.error('[setPrimary] Error:', err);
      toast({ title: 'Erro ao definir primário', variant: 'destructive' });
      return false;
    }
  }, [farmId, loadAgronomists, toast]);

  useEffect(() => {
    loadAgronomists();
  }, [loadAgronomists]);

  return { loading, agronomists, addAgronomist, removeAgronomist, setPrimary, refresh: loadAgronomists };
}

// Hook to get AI usage for workspace
export function useWorkspaceAIUsage(workspaceId: string | undefined, days: number = 30) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<AIUsageDay[]>([]);
  const [totalRequests, setTotalRequests] = useState(0);

  useEffect(() => {
    async function load() {
      if (!workspaceId) {
        setLoading(false);
        return;
      }

      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
          .from('ai_usage_log')
          .select('day, requests, tokens_in, tokens_out, source')
          .eq('workspace_id', workspaceId)
          .gte('day', startDate.toISOString().split('T')[0])
          .order('day', { ascending: false });

        if (error) throw error;

        setUsage(data || []);
        setTotalRequests((data || []).reduce((sum, d) => sum + d.requests, 0));
      } catch (err) {
        console.error('[useWorkspaceAIUsage] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [workspaceId, days]);

  return { loading, usage, totalRequests };
}

// Hook to check if farm has agronomist and get escalation info
export function useFarmEscalation(farmId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [hasAgronomist, setHasAgronomist] = useState(false);
  const [primaryAgronomist, setPrimaryAgronomist] = useState<FarmAgronomist | null>(null);

  useEffect(() => {
    async function load() {
      if (!farmId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('farm_agronomists')
          .select('agronomist_user_id, is_primary, channel_pref')
          .eq('farm_id', farmId);

        if (error) throw error;

        setHasAgronomist((data?.length || 0) > 0);

        const primary = data?.find(a => a.is_primary) || data?.[0];
        if (primary) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', primary.agronomist_user_id)
            .maybeSingle();

          setPrimaryAgronomist({
            agronomist_user_id: primary.agronomist_user_id,
            email: '',
            nome: profile?.nome || null,
            is_primary: primary.is_primary,
            channel_pref: primary.channel_pref,
          });
        }
      } catch (err) {
        console.error('[useFarmEscalation] Error:', err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [farmId]);

  const escalateToAgronomist = useCallback(async (
    question: string, 
    contextJson: Record<string, unknown> = {},
    aiResponse?: string
  ) => {
    if (!user || !farmId) return null;

    try {
      // Get workspace_id from farm
      const { data: farmWorkspaceId } = await supabase.rpc('get_farm_workspace_id', { _farm_id: farmId });

      const { data: questionRecord, error } = await supabase
        .from('agro_questions')
        .insert({
          asked_by_user_id: user.id,
          farm_id: farmId,
          workspace_id: farmWorkspaceId,
          question,
          context_json: {
            ...contextJson,
            ai_response: aiResponse,
          },
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ 
        title: 'Pergunta enviada ao agrônomo',
        description: 'Você receberá uma resposta em breve.'
      });

      return questionRecord;
    } catch (err) {
      console.error('[escalateToAgronomist] Error:', err);
      toast({ title: 'Erro ao enviar pergunta', variant: 'destructive' });
      return null;
    }
  }, [user, farmId, toast]);

  return { loading, hasAgronomist, primaryAgronomist, escalateToAgronomist };
}

// Hook for agronomist inbox (questions assigned to them)
export function useAgronomistInbox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<any[]>([]);

  const loadQuestions = useCallback(async () => {
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
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Get open questions for those farms
      const { data, error } = await supabase
        .from('agro_questions')
        .select('*')
        .in('farm_id', farmIds)
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user names
      const questionsWithInfo = [];
      for (const q of data || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', q.asked_by_user_id)
          .maybeSingle();

        const { data: farm } = await supabase
          .from('farms')
          .select('nome')
          .eq('id', q.farm_id)
          .maybeSingle();

        questionsWithInfo.push({
          ...q,
          user_name: profile?.nome || 'Produtor',
          farm_name: farm?.nome || 'Fazenda',
        });
      }

      setQuestions(questionsWithInfo);
    } catch (err) {
      console.error('[useAgronomistInbox] Error:', err);
      toast({ title: 'Erro ao carregar perguntas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const answerQuestion = useCallback(async (questionId: string, answer: string) => {
    if (!user) return false;

    try {
      // Create answer
      const { error: answerError } = await supabase
        .from('agro_answers')
        .insert({
          agro_question_id: questionId,
          answer,
          answered_by_user_id: user.id,
        });

      if (answerError) throw answerError;

      // Update status
      const { error: statusError } = await supabase
        .from('agro_questions')
        .update({ status: 'answered' })
        .eq('id', questionId);

      if (statusError) throw statusError;

      toast({ title: 'Resposta enviada' });
      await loadQuestions();
      return true;
    } catch (err) {
      console.error('[answerQuestion] Error:', err);
      toast({ title: 'Erro ao responder', variant: 'destructive' });
      return false;
    }
  }, [user, loadQuestions, toast]);

  const closeQuestion = useCallback(async (questionId: string) => {
    try {
      const { error } = await supabase
        .from('agro_questions')
        .update({ status: 'closed' })
        .eq('id', questionId);

      if (error) throw error;

      toast({ title: 'Pergunta fechada' });
      await loadQuestions();
      return true;
    } catch (err) {
      console.error('[closeQuestion] Error:', err);
      toast({ title: 'Erro ao fechar pergunta', variant: 'destructive' });
      return false;
    }
  }, [loadQuestions, toast]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return { loading, questions, answerQuestion, closeQuestion, refresh: loadQuestions };
}
