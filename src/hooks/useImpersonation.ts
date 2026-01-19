/**
 * Hook for user impersonation (superadmin only)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSuperadmin } from './useSuperadmin';
import { useToast } from '@/hooks/use-toast';

interface ImpersonationSession {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  target_email?: string;
  reason: string | null;
  started_at: string;
}

const IMPERSONATION_KEY = 'impersonation_session';

export function useImpersonation() {
  const { isSuperadmin, logAudit } = useSuperadmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<ImpersonationSession | null>(null);

  // Check for active impersonation on mount
  useEffect(() => {
    const storedSession = localStorage.getItem(IMPERSONATION_KEY);
    if (storedSession) {
      try {
        setSession(JSON.parse(storedSession));
      } catch {
        localStorage.removeItem(IMPERSONATION_KEY);
      }
    }
  }, []);

  // Start impersonation
  const startImpersonation = useCallback(async (
    targetUserId: string,
    targetEmail: string,
    reason?: string
  ) => {
    if (!isSuperadmin) return false;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create impersonation session record
      const { data: sessionData, error } = await supabase
        .from('impersonation_sessions')
        .insert({
          admin_user_id: user.id,
          target_user_id: targetUserId,
          reason: reason || null,
        })
        .select()
        .single();

      if (error) throw error;

      const impSession: ImpersonationSession = {
        id: sessionData.id,
        admin_user_id: user.id,
        target_user_id: targetUserId,
        target_email: targetEmail,
        reason: reason || null,
        started_at: sessionData.started_at,
      };

      // Store in localStorage for persistence
      localStorage.setItem(IMPERSONATION_KEY, JSON.stringify(impSession));
      setSession(impSession);

      // Log audit
      await logAudit('impersonation_start', 'user', targetUserId, null, { reason });

      toast({ 
        title: 'Impersonação iniciada',
        description: `Você está visualizando como ${targetEmail}`,
      });

      return true;
    } catch (err: any) {
      console.error('[startImpersonation] Error:', err);
      toast({ title: 'Erro ao iniciar impersonação', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSuperadmin, logAudit, toast]);

  // End impersonation
  const endImpersonation = useCallback(async () => {
    if (!session) return false;
    setLoading(true);

    try {
      // Update session end time
      await supabase
        .from('impersonation_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', session.id);

      // Log audit
      await logAudit('impersonation_end', 'user', session.target_user_id);

      // Clear localStorage
      localStorage.removeItem(IMPERSONATION_KEY);
      setSession(null);

      toast({ title: 'Impersonação encerrada' });
      return true;
    } catch (err: any) {
      console.error('[endImpersonation] Error:', err);
      toast({ title: 'Erro ao encerrar impersonação', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [session, logAudit, toast]);

  // Get the effective user ID (impersonated or real)
  const getEffectiveUserId = useCallback(async () => {
    if (session) {
      return session.target_user_id;
    }
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  }, [session]);

  return {
    loading,
    isImpersonating: !!session,
    impersonatedUser: session,
    startImpersonation,
    endImpersonation,
    getEffectiveUserId,
  };
}
