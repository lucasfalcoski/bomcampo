import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Partner {
  id: string;
  name: string;
  type: string | null;
}

interface PartnerUser {
  user_id: string;
  email: string;
  partner_id: string;
  roles: string[];
}

interface PartnerMetrics {
  total_users: number;
  partner_admin_count: number;
  partner_agronomist_count: number;
  producer_count: number;
}

export function usePartnersAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerMetrics, setPartnerMetrics] = useState<Record<string, PartnerMetrics>>({});
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Audit log helper
  const logAction = useCallback(async (
    action: string,
    targetType: string,
    targetId?: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!user) return;
    
    try {
      // Use type assertion for the new table
      await (supabase.from('admin_audit_log') as unknown as {
        insert: (data: {
          admin_user_id: string;
          action: string;
          target_type: string;
          target_id: string | null;
          metadata: Record<string, unknown>;
        }) => Promise<{ error: unknown }>;
      }).insert({
        admin_user_id: user.id,
        action,
        target_type: targetType,
        target_id: targetId || null,
        metadata: metadata || {},
      });
      console.log(`admin: ${action}`, { targetType, targetId, metadata });
    } catch (err) {
      console.error('Error logging action:', err);
    }
  }, [user]);

  // Check if user is system_admin
  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'system_admin')
          .maybeSingle();

        if (error) {
          console.error('Error checking admin access:', error);
          setIsSystemAdmin(false);
        } else {
          setIsSystemAdmin(!!data);
        }
      } catch (err) {
        console.error('Error checking access:', err);
        setIsSystemAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user]);

  // Load partner metrics (counts)
  const loadPartnerMetrics = useCallback(async (partnerIds: string[]) => {
    if (partnerIds.length === 0) return;

    const metricsMap: Record<string, PartnerMetrics> = {};

    for (const partnerId of partnerIds) {
      try {
        // Get users with this partner_id
        const { data: users } = await supabase
          .rpc('get_partner_users', { _partner_id: partnerId });

        const userIds = users?.map((u: { user_id: string }) => u.user_id) || [];
        
        let partnerAdminCount = 0;
        let partnerAgronomistCount = 0;
        let producerCount = 0;

        if (userIds.length > 0) {
          // Get roles for these users
          const { data: roles } = await supabase
            .from('user_roles')
            .select('user_id, role')
            .in('user_id', userIds);

          const rolesByUser: Record<string, string[]> = {};
          roles?.forEach((r) => {
            if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
            rolesByUser[r.user_id].push(r.role);
          });

          userIds.forEach((uid: string) => {
            const userRoles = rolesByUser[uid] || [];
            if (userRoles.includes('partner_admin')) partnerAdminCount++;
            if (userRoles.includes('partner_agronomist')) partnerAgronomistCount++;
            if (userRoles.includes('produtor') && !userRoles.includes('partner_admin') && !userRoles.includes('partner_agronomist')) {
              producerCount++;
            }
          });
        }

        metricsMap[partnerId] = {
          total_users: userIds.length,
          partner_admin_count: partnerAdminCount,
          partner_agronomist_count: partnerAgronomistCount,
          producer_count: producerCount,
        };
      } catch (err) {
        console.error('Error loading metrics for partner:', partnerId, err);
        metricsMap[partnerId] = {
          total_users: 0,
          partner_admin_count: 0,
          partner_agronomist_count: 0,
          producer_count: 0,
        };
      }
    }

    setPartnerMetrics(metricsMap);
  }, []);

  // Load partners
  const loadPartners = useCallback(async () => {
    if (!isSystemAdmin) return;

    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, type')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
      
      // Load metrics for all partners
      if (data && data.length > 0) {
        await loadPartnerMetrics(data.map(p => p.id));
      }
    } catch (err) {
      console.error('Error loading partners:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os parceiros.',
        variant: 'destructive',
      });
    }
  }, [isSystemAdmin, toast, loadPartnerMetrics]);

  useEffect(() => {
    if (isSystemAdmin) {
      loadPartners();
    }
  }, [isSystemAdmin, loadPartners]);

  // Create partner
  const createPartner = async (name: string, type: string) => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .insert({ name, type })
        .select()
        .single();

      if (error) throw error;

      await logAction('create_partner', 'partner', data.id, { name, type });

      toast({
        title: 'Sucesso',
        description: 'Parceiro criado com sucesso.',
      });

      await loadPartners();
      return true;
    } catch (err: unknown) {
      console.error('Error creating partner:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível criar o parceiro.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Load partner users
  const loadPartnerUsers = async (partnerId: string) => {
    setLoadingUsers(true);
    try {
      const { data: users, error: usersError } = await supabase
        .rpc('get_partner_users', { _partner_id: partnerId });

      if (usersError) throw usersError;

      const usersWithRoles: PartnerUser[] = [];
      
      for (const u of users || []) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', u.user_id);

        usersWithRoles.push({
          user_id: u.user_id,
          email: u.email,
          partner_id: u.partner_id,
          roles: roles?.map(r => r.role) || [],
        });
      }

      setPartnerUsers(usersWithRoles);
    } catch (err) {
      console.error('Error loading partner users:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os usuários do parceiro.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  // Select partner for management
  const selectPartner = async (partner: Partner) => {
    setSelectedPartner(partner);
    await loadPartnerUsers(partner.id);
  };

  // Add user to partner (with partner role)
  const addUserToPartner = async (email: string, role: 'partner_admin' | 'partner_agronomist') => {
    if (!selectedPartner) return false;

    try {
      const { data: userId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (findError) throw findError;

      if (!userId) {
        toast({
          title: 'Usuário não encontrado',
          description: 'O usuário precisa se cadastrar primeiro. Peça para ele criar uma conta e depois vincule-o aqui.',
          variant: 'destructive',
        });
        return false;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: selectedPartner.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (roleError) throw roleError;
      }

      await logAction('create_partner_user', 'user', userId, { 
        partner_id: selectedPartner.id, 
        email, 
        role 
      });

      toast({
        title: 'Sucesso',
        description: 'Usuário adicionado ao parceiro.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: unknown) {
      console.error('Error adding user to partner:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível adicionar o usuário.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Link producer to partner (keep produtor role, just add partner_id)
  const linkProducerToPartner = async (email: string) => {
    if (!selectedPartner) return false;

    try {
      const { data: userId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (findError) throw findError;

      if (!userId) {
        toast({
          title: 'Usuário não encontrado',
          description: 'O produtor precisa se cadastrar primeiro. Peça para ele criar uma conta.',
          variant: 'destructive',
        });
        return false;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: selectedPartner.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      await logAction('link_producer_to_partner', 'user', userId, { 
        partner_id: selectedPartner.id, 
        email 
      });

      toast({
        title: 'Sucesso',
        description: 'Produtor vinculado ao parceiro com sucesso.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: unknown) {
      console.error('Error linking producer to partner:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível vincular o produtor.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Unlink producer from partner
  const unlinkProducerFromPartner = async (email: string) => {
    try {
      const { data: userId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (findError) throw findError;

      if (!userId) {
        toast({
          title: 'Usuário não encontrado',
          description: 'Não foi possível encontrar o usuário com esse e-mail.',
          variant: 'destructive',
        });
        return false;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: null })
        .eq('id', userId);

      if (profileError) throw profileError;

      await logAction('unlink_producer_from_partner', 'user', userId, { 
        email 
      });

      toast({
        title: 'Sucesso',
        description: 'Produtor desvinculado.',
      });

      if (selectedPartner) {
        await loadPartnerUsers(selectedPartner.id);
      }
      return true;
    } catch (err: unknown) {
      console.error('Error unlinking producer:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível desvincular o produtor.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Update user role (promote/demote between partner_admin and partner_agronomist)
  const updateUserRole = async (userId: string, currentRole: 'partner_admin' | 'partner_agronomist', newRole: 'partner_admin' | 'partner_agronomist') => {
    if (!selectedPartner) return false;

    try {
      // Remove old role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', currentRole);

      if (deleteError) throw deleteError;

      // Add new role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (insertError) throw insertError;

      await logAction('update_partner_user_role', 'user', userId, { 
        partner_id: selectedPartner.id,
        old_role: currentRole,
        new_role: newRole 
      });

      toast({
        title: 'Sucesso',
        description: 'Função do usuário atualizada.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: unknown) {
      console.error('Error updating user role:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível atualizar a função.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Remove user from partner
  const removeUserFromPartner = async (userId: string) => {
    if (!selectedPartner) return false;

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: null })
        .eq('id', userId);

      if (profileError) throw profileError;

      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'partner_admin');
      
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'partner_agronomist');

      await logAction('unlink_producer_from_partner', 'user', userId, { 
        partner_id: selectedPartner.id 
      });

      toast({
        title: 'Sucesso',
        description: 'Usuário removido do parceiro.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: unknown) {
      console.error('Error removing user from partner:', err);
      const message = err instanceof Error ? err.message : 'Não foi possível remover o usuário.';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    loading,
    isSystemAdmin,
    partners,
    partnerMetrics,
    selectedPartner,
    partnerUsers,
    loadingUsers,
    createPartner,
    selectPartner,
    setSelectedPartner,
    addUserToPartner,
    linkProducerToPartner,
    unlinkProducerFromPartner,
    updateUserRole,
    removeUserFromPartner,
    refreshPartners: loadPartners,
  };
}
