/**
 * React hook for entitlements and quota management
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  EffectiveFlags,
  AIAccessResult,
  QuotaInfo,
  getEffectiveFlags,
  canUseAI,
  getRemainingAIQuota,
  isPremium,
  isEnterprise,
  incrementAIUsage,
} from '@/lib/entitlements';
import { supabase } from '@/integrations/supabase/client';

interface UseEntitlementsOptions {
  workspaceId?: string | null;
  autoLoad?: boolean;
}

interface UseEntitlementsResult {
  // State
  loading: boolean;
  error: string | null;
  flags: EffectiveFlags | null;
  aiAccess: AIAccessResult | null;
  quota: QuotaInfo | null;
  workspaceId: string | null;
  workspacePlan: string | null;

  // Computed
  canUseAIFeature: boolean;
  isPremiumPlan: boolean;
  isEnterprisePlan: boolean;

  // Actions
  refresh: () => Promise<void>;
  checkAIAccess: () => Promise<AIAccessResult>;
  trackAIUsage: (source?: string, tokensIn?: number, tokensOut?: number) => Promise<boolean>;
}

export function useEntitlements(options: UseEntitlementsOptions = {}): UseEntitlementsResult {
  const { autoLoad = true } = options;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<EffectiveFlags | null>(null);
  const [aiAccess, setAIAccess] = useState<AIAccessResult | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(options.workspaceId || null);
  const [workspacePlan, setWorkspacePlan] = useState<string | null>(null);

  // Load user's workspace if not provided
  const loadUserWorkspace = useCallback(async () => {
    if (options.workspaceId) {
      setWorkspaceId(options.workspaceId);
      return options.workspaceId;
    }

    if (!user?.id) return null;

    // Try to get user's workspace from workspace_members
    const { data, error: wsError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(id, plan)')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (wsError || !data) {
      // User might not be in any workspace yet (B2C legacy)
      return null;
    }

    const wsId = data.workspace_id;
    const wsPlan = (data.workspaces as { id: string; plan: string } | null)?.plan || 'free';
    
    setWorkspaceId(wsId);
    setWorkspacePlan(wsPlan);
    return wsId;
  }, [user?.id, options.workspaceId]);

  // Load all entitlement data
  const loadEntitlements = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const wsId = await loadUserWorkspace();

      // Load effective flags
      const effectiveFlags = await getEffectiveFlags(wsId, user.id);
      setFlags(effectiveFlags);

      // Load AI access status
      const access = await canUseAI(wsId, user.id);
      setAIAccess(access);

      // Load quota if workspace exists
      if (wsId) {
        const quotaInfo = await getRemainingAIQuota(wsId, user.id);
        setQuota(quotaInfo);
      }
    } catch (err) {
      console.error('[useEntitlements] Error loading entitlements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load entitlements');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadUserWorkspace]);

  // Check AI access
  const checkAIAccess = useCallback(async (): Promise<AIAccessResult> => {
    if (!user?.id || !workspaceId) {
      return { allowed: false, reason: 'no_workspace' };
    }

    const access = await canUseAI(workspaceId, user.id);
    setAIAccess(access);
    return access;
  }, [user?.id, workspaceId]);

  // Track AI usage
  const trackAIUsage = useCallback(async (
    source: string = 'chat',
    tokensIn: number = 0,
    tokensOut: number = 0
  ): Promise<boolean> => {
    if (!workspaceId) return false;

    const success = await incrementAIUsage(workspaceId, source, tokensIn, tokensOut);
    
    // Refresh quota after tracking
    if (success && user?.id) {
      const quotaInfo = await getRemainingAIQuota(workspaceId, user.id);
      setQuota(quotaInfo);
    }

    return success;
  }, [workspaceId, user?.id]);

  // Refresh all data
  const refresh = useCallback(async () => {
    await loadEntitlements();
  }, [loadEntitlements]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadEntitlements();
    }
  }, [autoLoad, user?.id, loadEntitlements]);

  // Computed values
  const canUseAIFeature = aiAccess?.allowed ?? false;
  const isPremiumPlan = workspacePlan ? isPremium(workspacePlan) : false;
  const isEnterprisePlan = workspacePlan ? isEnterprise(workspacePlan) : false;

  return {
    loading,
    error,
    flags,
    aiAccess,
    quota,
    workspaceId,
    workspacePlan,
    canUseAIFeature,
    isPremiumPlan,
    isEnterprisePlan,
    refresh,
    checkAIAccess,
    trackAIUsage,
  };
}

/**
 * Simplified hook for checking a single feature flag
 */
export function useFeatureFlag(flagKey: string, defaultValue: boolean = false): {
  enabled: boolean;
  loading: boolean;
} {
  const { flags, loading } = useEntitlements();

  const enabled = flags ? (flags[flagKey] === true) : defaultValue;

  return { enabled, loading };
}

/**
 * Hook for AI quota display
 */
export function useAIQuota(): {
  loading: boolean;
  canUse: boolean;
  remaining: number;
  limit: number;
  usagePercent: number;
  reason: string | null;
} {
  const { loading, aiAccess, quota } = useEntitlements();

  return {
    loading,
    canUse: aiAccess?.allowed ?? false,
    remaining: quota?.remaining ?? 0,
    limit: quota?.limit ?? 0,
    usagePercent: quota ? Math.round((quota.used / Math.max(quota.limit, 1)) * 100) : 0,
    reason: aiAccess?.reason === 'ok' ? null : (aiAccess?.reason ?? null),
  };
}
