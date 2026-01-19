/**
 * Hook for superadmin access control and audit logging
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseSuperadminResult {
  loading: boolean;
  isSuperadmin: boolean;
  isSupport: boolean;
  isOps: boolean;
  isSystemStaff: boolean;
  systemRole: string | null;
  logAudit: (action: string, entity: string, targetId?: string, before?: unknown, after?: unknown) => Promise<void>;
}

export function useSuperadmin(): UseSuperadminResult {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [systemRole, setSystemRole] = useState<string | null>(null);

  useEffect(() => {
    async function checkSystemRole() {
      if (!user?.id) {
        setLoading(false);
        setSystemRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_system_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          setSystemRole(null);
        } else {
          setSystemRole(data.role);
        }
      } catch {
        setSystemRole(null);
      } finally {
        setLoading(false);
      }
    }

    checkSystemRole();
  }, [user?.id]);

  const logAudit = useCallback(async (
    action: string,
    entity: string,
    targetId?: string,
    before?: unknown,
    after?: unknown
  ) => {
    if (!user?.id) return;

    try {
      await supabase.from('admin_audit_log').insert([{
        admin_user_id: user.id,
        action,
        target_type: entity,
        target_id: targetId || null,
        metadata: JSON.parse(JSON.stringify({
          before: before || null,
          after: after || null,
        })),
      }]);
    } catch (err) {
      console.error('[Audit] Failed to log action:', err);
    }
  }, [user?.id]);

  return {
    loading,
    isSuperadmin: systemRole === 'superadmin',
    isSupport: systemRole === 'support',
    isOps: systemRole === 'ops',
    isSystemStaff: systemRole !== null,
    systemRole,
    logAudit,
  };
}
