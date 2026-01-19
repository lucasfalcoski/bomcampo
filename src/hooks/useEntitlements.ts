/**
 * React hook for entitlements and quota management
 * Now uses Edge Function to fetch entitlements (bypasses RLS)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  EffectiveFlags,
  AIAccessResult,
  QuotaInfo,
  canUseAI,
  getRemainingAIQuota,
  isPremium,
  isEnterprise,
  incrementAIUsage,
  fetchEntitlements,
  clearEntitlementsCache,
} from '@/lib/entitlements';

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

  // Load all entitlement data via Edge Function
  const loadEntitlements = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch entitlements from Edge Function (bypasses RLS)
      const response = await fetchEntitlements(options.workspaceId);
      
      if (!response) {
        setError('Não foi possível carregar permissões');
        setLoading(false);
        return;
      }

      // Update state from API response
      setFlags(response.flags);
      setWorkspaceId(response.workspace_id);
      setWorkspacePlan(response.workspace.plan);

      // Build AI access result
      const access: AIAccessResult = {
        allowed: response.ai.allowed,
        reason: response.ai.reason as AIAccessResult['reason'],
        remaining: response.ai.remaining,
        dailyLimit: response.ai.limit,
        bypass: response.ai.bypass,
        debug_reason: response.meta?.debug?.debug_reason,
        debug: response.meta?.debug ? {
          limit: response.ai.limit,
          used: response.ai.used,
          remaining: response.ai.remaining,
          plan_used: response.workspace.plan === 'premium' || response.workspace.plan === 'enterprise' ? 'premium' : 'free',
          limit_source: (response.meta?.limit_source as 'campaign' | 'workspace' | 'global' | 'default') || 'default',
          bypass: response.ai.bypass || false,
          is_superadmin: response.meta.debug.is_superadmin || false,
          ai_admin_bypass_flag: response.meta.debug.ai_admin_bypass_flag || false,
          workspace_id: response.workspace_id,
          ai_enabled_raw: response.flags.ai_enabled,
          ai_enabled_normalized: response.flags.ai_enabled === true,
          source_map: response.meta.source_map,
          raw_values: response.meta.debug.raw_values,
        } : undefined,
      };
      setAIAccess(access);

      // Build quota info
      if (response.workspace_id) {
        const now = new Date();
        const brtOffset = -3 * 60;
        const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
        const brtTime = new Date(utcTime + brtOffset * 60000);
        
        const resetAt = new Date(Date.UTC(
          brtTime.getUTCFullYear(),
          brtTime.getUTCMonth(),
          brtTime.getUTCDate() + 1,
          3, 0, 0, 0
        ));

        setQuota({
          used: response.ai.used,
          limit: response.ai.limit,
          remaining: response.ai.remaining,
          resetAt,
        });
      }
    } catch (err) {
      console.error('[useEntitlements] Error loading entitlements:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar permissões');
    } finally {
      setLoading(false);
    }
  }, [user?.id, options.workspaceId]);

  // Check AI access
  const checkAIAccess = useCallback(async (): Promise<AIAccessResult> => {
    if (!user?.id) {
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
    
    // Refresh entitlements after tracking
    if (success) {
      await loadEntitlements();
    }

    return success;
  }, [workspaceId, loadEntitlements]);

  // Refresh all data
  const refresh = useCallback(async () => {
    clearEntitlementsCache();
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
