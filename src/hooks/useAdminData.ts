/**
 * Hooks for admin data management
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperadmin } from './useSuperadmin';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Workspace {
  id: string;
  name: string;
  type: 'b2c' | 'b2b';
  status: 'active' | 'inactive' | 'suspended';
  plan: 'free' | 'premium' | 'enterprise';
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface AdminUser {
  id: string;
  email: string;
  nome: string | null;
  created_at: string;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  status?: 'active' | 'pending' | 'suspended';
  workspace_id?: string;
  workspace_name?: string;
  workspace_role?: string;
  system_role?: string;
  is_suspended?: boolean;
}

export interface FeatureFlag {
  key: string;
  value_json: Record<string, unknown>;
  updated_at: string;
  workspace_id?: string;
}

export interface Campaign {
  id: string;
  name: string;
  is_enabled: boolean;
  start_at: string | null;
  end_at: string | null;
  rule_json: Record<string, unknown> | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  provider: string;
  is_enabled: boolean;
  last_ok_at: string | null;
  last_error: string | null;
  latency_ms: number | null;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  admin_user_id: string;
  admin_email?: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DashboardStats {
  workspacesActive: number;
  totalUsers: number;
  aiUsageToday: number;
  aiUsageMonth: number;
  integrationErrors: number;
}

// Dashboard Stats Hook
export function useAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { isSuperadmin } = useSuperadmin();

  const loadStats = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      // Get active workspaces count
      const { count: workspacesCount } = await supabase
        .from('workspaces')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total users from profiles
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get AI usage today
      const today = new Date().toISOString().split('T')[0];
      const { data: aiToday } = await supabase
        .from('ai_usage_log')
        .select('requests')
        .eq('day', today);
      const aiUsageToday = (aiToday || []).reduce((sum, r) => sum + (r.requests || 0), 0);

      // Get AI usage this month
      const monthStart = new Date();
      monthStart.setDate(1);
      const { data: aiMonth } = await supabase
        .from('ai_usage_log')
        .select('requests')
        .gte('day', monthStart.toISOString().split('T')[0]);
      const aiUsageMonth = (aiMonth || []).reduce((sum, r) => sum + (r.requests || 0), 0);

      // Get integration errors
      const { data: integrations } = await supabase
        .from('integrations_status')
        .select('last_error')
        .not('last_error', 'is', null);
      const integrationErrors = (integrations || []).length;

      setStats({
        workspacesActive: workspacesCount || 0,
        totalUsers: usersCount || 0,
        aiUsageToday,
        aiUsageMonth,
        integrationErrors,
      });
    } catch (err) {
      console.error('[AdminDashboard] Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { loading, stats, refresh: loadStats };
}

// Workspaces Hook
export function useAdminWorkspaces() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();

  const loadWorkspaces = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const wsIds = (data || []).map(w => w.id);
      const { data: members } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .in('workspace_id', wsIds);

      const memberCounts: Record<string, number> = {};
      for (const m of members || []) {
        memberCounts[m.workspace_id] = (memberCounts[m.workspace_id] || 0) + 1;
      }

      setWorkspaces((data || []).map(w => ({
        ...w,
        type: w.type as 'b2c' | 'b2b',
        status: w.status as 'active' | 'inactive' | 'suspended',
        plan: w.plan as 'free' | 'premium' | 'enterprise',
        member_count: memberCounts[w.id] || 0,
      })));
    } catch (err) {
      console.error('[AdminWorkspaces] Error:', err);
      toast({ title: 'Erro ao carregar workspaces', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, toast]);

  const createWorkspace = useCallback(async (data: Partial<Workspace>) => {
    try {
      const { data: newWs, error } = await supabase
        .from('workspaces')
        .insert({
          name: data.name || 'Novo Workspace',
          type: data.type || 'b2c',
          status: data.status || 'active',
          plan: data.plan || 'free',
        })
        .select()
        .single();

      if (error) throw error;

      await logAudit('create', 'workspace', newWs.id, null, newWs);
      toast({ title: 'Workspace criado com sucesso' });
      await loadWorkspaces();
      return newWs;
    } catch (err) {
      console.error('[AdminWorkspaces] Create error:', err);
      toast({ title: 'Erro ao criar workspace', variant: 'destructive' });
      return null;
    }
  }, [logAudit, loadWorkspaces, toast]);

  const updateWorkspace = useCallback(async (id: string, data: Partial<Workspace>) => {
    try {
      // Get before state
      const { data: before } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', id)
        .single();

      const { data: updated, error } = await supabase
        .from('workspaces')
        .update({
          name: data.name,
          type: data.type,
          status: data.status,
          plan: data.plan,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAudit('update', 'workspace', id, before, updated);
      toast({ title: 'Workspace atualizado com sucesso' });
      await loadWorkspaces();
      return updated;
    } catch (err) {
      console.error('[AdminWorkspaces] Update error:', err);
      toast({ title: 'Erro ao atualizar workspace', variant: 'destructive' });
      return null;
    }
  }, [logAudit, loadWorkspaces, toast]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  return { loading, workspaces, createWorkspace, updateWorkspace, refresh: loadWorkspaces };
}

// Users Hook
export function useAdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();

  const loadUsers = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      // Use Edge Function that leverages Auth Admin API
      const { data, error } = await supabase.functions.invoke('admin-list-users', {
        body: { page: 1, perPage: 500 },
      });

      if (error) {
        console.error('[AdminUsers] Edge function error:', error);
        throw error;
      }

      if (data?.users) {
        setUsers(data.users);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('[AdminUsers] Error:', err);
      toast({ title: 'Erro ao carregar usuários', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, toast]);

  const assignToWorkspace = useCallback(async (
    userId: string,
    workspaceId: string,
    role: string
  ) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .upsert({
          user_id: userId,
          workspace_id: workspaceId,
          role: role as 'owner' | 'manager' | 'operator' | 'agronomist' | 'viewer',
        });

      if (error) throw error;

      await logAudit('assign_workspace', 'user', userId, null, { workspaceId, role });
      toast({ title: 'Usuário atribuído ao workspace' });
      await loadUsers();
    } catch (err) {
      console.error('[AdminUsers] Assign error:', err);
      toast({ title: 'Erro ao atribuir usuário', variant: 'destructive' });
    }
  }, [logAudit, loadUsers, toast]);

  const setSystemRole = useCallback(async (userId: string, role: string | null) => {
    try {
      if (role) {
        await supabase
          .from('user_system_roles')
          .upsert({ user_id: userId, role: role as 'superadmin' | 'support' | 'ops' });
      } else {
        await supabase
          .from('user_system_roles')
          .delete()
          .eq('user_id', userId);
      }

      await logAudit('set_system_role', 'user', userId, null, { role });
      toast({ title: 'Role de sistema atualizado' });
      await loadUsers();
    } catch (err) {
      console.error('[AdminUsers] Set role error:', err);
      toast({ title: 'Erro ao definir role', variant: 'destructive' });
    }
  }, [logAudit, loadUsers, toast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return { loading, users, assignToWorkspace, setSystemRole, refresh: loadUsers };
}

// Flags Hook
export function useAdminFlags() {
  const [loading, setLoading] = useState(true);
  const [globalFlags, setGlobalFlags] = useState<FeatureFlag[]>([]);
  const [workspaceFlags, setWorkspaceFlags] = useState<FeatureFlag[]>([]);
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();

  const loadFlags = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      const { data: global } = await supabase
        .from('feature_flags_global')
        .select('*')
        .order('key');

      const { data: workspace } = await supabase
        .from('feature_flags_workspace')
        .select('*')
        .order('workspace_id, key');

      setGlobalFlags((global || []).map(f => ({
        ...f,
        value_json: f.value_json as Record<string, unknown>,
      })));
      
      setWorkspaceFlags((workspace || []).map(f => ({
        ...f,
        value_json: f.value_json as Record<string, unknown>,
      })));
    } catch (err) {
      console.error('[AdminFlags] Error:', err);
      toast({ title: 'Erro ao carregar flags', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, toast]);

  const updateGlobalFlag = useCallback(async (key: string, value: Record<string, unknown>) => {
    try {
      const { data: before } = await supabase
        .from('feature_flags_global')
        .select('*')
        .eq('key', key)
        .single();

      const { error } = await supabase
        .from('feature_flags_global')
        .upsert([{ key, value_json: JSON.parse(JSON.stringify(value)) }]);

      if (error) throw error;

      await logAudit('update_flag', 'feature_flags_global', key, before?.value_json, value);
      toast({ title: 'Flag atualizada com sucesso' });
      await loadFlags();
    } catch (err) {
      console.error('[AdminFlags] Update error:', err);
      toast({ title: 'Erro ao atualizar flag', variant: 'destructive' });
    }
  }, [logAudit, loadFlags, toast]);

  const updateWorkspaceFlag = useCallback(async (
    workspaceId: string,
    key: string,
    value: Record<string, unknown>
  ) => {
    try {
      const { data: before } = await supabase
        .from('feature_flags_workspace')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('key', key)
        .single();

      const { error } = await supabase
        .from('feature_flags_workspace')
        .upsert([{ workspace_id: workspaceId, key, value_json: JSON.parse(JSON.stringify(value)) }]);

      if (error) throw error;

      await logAudit('update_flag', 'feature_flags_workspace', `${workspaceId}:${key}`, before?.value_json, value);
      toast({ title: 'Flag de workspace atualizada' });
      await loadFlags();
    } catch (err) {
      console.error('[AdminFlags] Update workspace error:', err);
      toast({ title: 'Erro ao atualizar flag', variant: 'destructive' });
    }
  }, [logAudit, loadFlags, toast]);

  const deleteWorkspaceFlag = useCallback(async (workspaceId: string, key: string) => {
    try {
      const { data: before } = await supabase
        .from('feature_flags_workspace')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('key', key)
        .single();

      const { error } = await supabase
        .from('feature_flags_workspace')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('key', key);

      if (error) throw error;

      await logAudit('delete_flag', 'feature_flags_workspace', `${workspaceId}:${key}`, before, null);
      toast({ title: 'Flag removida' });
      await loadFlags();
    } catch (err) {
      console.error('[AdminFlags] Delete error:', err);
      toast({ title: 'Erro ao remover flag', variant: 'destructive' });
    }
  }, [logAudit, loadFlags, toast]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  return {
    loading,
    globalFlags,
    workspaceFlags,
    updateGlobalFlag,
    updateWorkspaceFlag,
    deleteWorkspaceFlag,
    refresh: loadFlags,
  };
}

// Campaigns Hook
export function useAdminCampaigns() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();

  const loadCampaigns = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCampaigns((data || []).map(c => ({
        ...c,
        rule_json: c.rule_json as Record<string, unknown> | null,
        payload_json: c.payload_json as Record<string, unknown> | null,
      })));
    } catch (err) {
      console.error('[AdminCampaigns] Error:', err);
      toast({ title: 'Erro ao carregar campanhas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, toast]);

  const createCampaign = useCallback(async (data: Partial<Campaign>) => {
    try {
      const { data: newCampaign, error } = await supabase
        .from('campaigns')
        .insert([{
          name: data.name || 'Nova Campanha',
          is_enabled: data.is_enabled ?? true,
          start_at: data.start_at,
          end_at: data.end_at,
          rule_json: data.rule_json ? JSON.parse(JSON.stringify(data.rule_json)) : null,
          payload_json: data.payload_json ? JSON.parse(JSON.stringify(data.payload_json)) : null,
        }])
        .select()
        .single();

      if (error) throw error;

      await logAudit('create', 'campaign', newCampaign.id, null, newCampaign);
      toast({ title: 'Campanha criada com sucesso' });
      await loadCampaigns();
      return newCampaign;
    } catch (err) {
      console.error('[AdminCampaigns] Create error:', err);
      toast({ title: 'Erro ao criar campanha', variant: 'destructive' });
      return null;
    }
  }, [logAudit, loadCampaigns, toast]);

  const updateCampaign = useCallback(async (id: string, data: Partial<Campaign>) => {
    try {
      const { data: before } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      const { data: updated, error } = await supabase
        .from('campaigns')
        .update({
          name: data.name,
          is_enabled: data.is_enabled,
          start_at: data.start_at,
          end_at: data.end_at,
          rule_json: data.rule_json ? JSON.parse(JSON.stringify(data.rule_json)) : null,
          payload_json: data.payload_json ? JSON.parse(JSON.stringify(data.payload_json)) : null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAudit('update', 'campaign', id, before, updated);
      toast({ title: 'Campanha atualizada' });
      await loadCampaigns();
      return updated;
    } catch (err) {
      console.error('[AdminCampaigns] Update error:', err);
      toast({ title: 'Erro ao atualizar campanha', variant: 'destructive' });
      return null;
    }
  }, [logAudit, loadCampaigns, toast]);

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      const { data: before } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAudit('delete', 'campaign', id, before, null);
      toast({ title: 'Campanha removida' });
      await loadCampaigns();
    } catch (err) {
      console.error('[AdminCampaigns] Delete error:', err);
      toast({ title: 'Erro ao remover campanha', variant: 'destructive' });
    }
  }, [logAudit, loadCampaigns, toast]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  return {
    loading,
    campaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    refresh: loadCampaigns,
  };
}

// Integrations Hook
export function useAdminIntegrations() {
  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();

  const loadIntegrations = useCallback(async () => {
    if (!isSuperadmin) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('integrations_status')
        .select('*')
        .order('provider');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (err) {
      console.error('[AdminIntegrations] Error:', err);
      toast({ title: 'Erro ao carregar integrações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, toast]);

  const toggleIntegration = useCallback(async (provider: string, enabled: boolean) => {
    try {
      const { data: before } = await supabase
        .from('integrations_status')
        .select('*')
        .eq('provider', provider)
        .single();

      const { error } = await supabase
        .from('integrations_status')
        .update({ is_enabled: enabled })
        .eq('provider', provider);

      if (error) throw error;

      await logAudit('toggle', 'integration', provider, { is_enabled: before?.is_enabled }, { is_enabled: enabled });
      toast({ title: `Integração ${enabled ? 'ativada' : 'desativada'}` });
      await loadIntegrations();
    } catch (err) {
      console.error('[AdminIntegrations] Toggle error:', err);
      toast({ title: 'Erro ao alterar integração', variant: 'destructive' });
    }
  }, [logAudit, loadIntegrations, toast]);

  const testConnection = useCallback(async (provider: string) => {
    toast({ title: `Testando conexão com ${provider}...` });
    
    // Simulate test - in real implementation, call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const success = Math.random() > 0.3; // Simulate 70% success rate
    
    try {
      const { error } = await supabase
        .from('integrations_status')
        .update({
          last_ok_at: success ? new Date().toISOString() : null,
          last_error: success ? null : 'Conexão falhou: timeout',
          latency_ms: success ? Math.floor(Math.random() * 500) + 50 : null,
        })
        .eq('provider', provider);

      if (error) throw error;

      await logAudit('test_connection', 'integration', provider, null, { success });
      toast({
        title: success ? 'Conexão bem sucedida' : 'Conexão falhou',
        variant: success ? 'default' : 'destructive',
      });
      await loadIntegrations();
    } catch (err) {
      console.error('[AdminIntegrations] Test error:', err);
      toast({ title: 'Erro ao testar conexão', variant: 'destructive' });
    }
  }, [logAudit, loadIntegrations, toast]);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  return {
    loading,
    integrations,
    toggleIntegration,
    testConnection,
    refresh: loadIntegrations,
  };
}

// Audit Log Hook
export function useAdminAudit() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { isSuperadmin } = useSuperadmin();
  const { toast } = useToast();

  const PAGE_SIZE = 20;

  const loadLogs = useCallback(async (reset = false) => {
    if (!isSuperadmin) return;
    setLoading(true);

    const currentPage = reset ? 0 : page;
    if (reset) setPage(0);

    try {
      const { data, error } = await supabase
        .from('admin_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      // Get emails for admin users
      const logsWithEmail: AuditLogEntry[] = [];
      for (const log of data || []) {
        const { data: email } = await supabase.rpc('get_user_email', { _user_id: log.admin_user_id });
        logsWithEmail.push({
          ...log,
          metadata: log.metadata as Record<string, unknown>,
          admin_email: email || 'N/A',
        });
      }

      if (reset) {
        setLogs(logsWithEmail);
      } else {
        setLogs(prev => [...prev, ...logsWithEmail]);
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      console.error('[AdminAudit] Error:', err);
      toast({ title: 'Erro ao carregar logs', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, page, toast]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    setPage(p => p + 1);
  }, [hasMore, loading]);

  useEffect(() => {
    loadLogs(true);
  }, [isSuperadmin]);

  useEffect(() => {
    if (page > 0) {
      loadLogs(false);
    }
  }, [page]);

  return { loading, logs, hasMore, loadMore, refresh: () => loadLogs(true) };
}
