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

export function usePartnersAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerUsers, setPartnerUsers] = useState<PartnerUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

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
    } catch (err) {
      console.error('Error loading partners:', err);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os parceiros.',
        variant: 'destructive',
      });
    }
  }, [isSystemAdmin, toast]);

  useEffect(() => {
    if (isSystemAdmin) {
      loadPartners();
    }
  }, [isSystemAdmin, loadPartners]);

  // Create partner
  const createPartner = async (name: string, type: string) => {
    try {
      const { error } = await supabase
        .from('partners')
        .insert({ name, type });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Parceiro criado com sucesso.',
      });

      await loadPartners();
      return true;
    } catch (err: any) {
      console.error('Error creating partner:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível criar o parceiro.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Load partner users
  const loadPartnerUsers = async (partnerId: string) => {
    setLoadingUsers(true);
    try {
      // Get users with this partner_id using RPC
      const { data: users, error: usersError } = await supabase
        .rpc('get_partner_users', { _partner_id: partnerId });

      if (usersError) throw usersError;

      // Get roles for each user
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

  // Add user to partner
  const addUserToPartner = async (email: string, role: 'partner_admin' | 'partner_agronomist') => {
    if (!selectedPartner) return false;

    try {
      // Find user by email
      const { data: userId, error: findError } = await supabase
        .rpc('find_user_by_email', { _email: email });

      if (findError) throw findError;

      if (!userId) {
        toast({
          title: 'Erro',
          description: 'Usuário não encontrado. O usuário precisa estar cadastrado no sistema.',
          variant: 'destructive',
        });
        return false;
      }

      // Update profile with partner_id
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: selectedPartner.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('role', role)
        .maybeSingle();

      if (!existingRole) {
        // Add role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role });

        if (roleError) throw roleError;
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário adicionado ao parceiro.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: any) {
      console.error('Error adding user to partner:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível adicionar o usuário.',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Remove user from partner
  const removeUserFromPartner = async (userId: string) => {
    if (!selectedPartner) return false;

    try {
      // Remove partner_id from profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ partner_id: null })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Remove partner roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['partner_admin', 'partner_agronomist']);

      if (roleError) throw roleError;

      toast({
        title: 'Sucesso',
        description: 'Usuário removido do parceiro.',
      });

      await loadPartnerUsers(selectedPartner.id);
      return true;
    } catch (err: any) {
      console.error('Error removing user from partner:', err);
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível remover o usuário.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    loading,
    isSystemAdmin,
    partners,
    selectedPartner,
    partnerUsers,
    loadingUsers,
    createPartner,
    selectPartner,
    setSelectedPartner,
    addUserToPartner,
    removeUserFromPartner,
    refreshPartners: loadPartners,
  };
}
