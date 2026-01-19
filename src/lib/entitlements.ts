/**
 * Entitlements & Quota Module
 * Centralized permission and quota management for B2C/B2B multi-tenant
 */

import { supabase } from "@/integrations/supabase/client";

// Types
export type WorkspacePlan = 'free' | 'premium' | 'enterprise';

export interface FeatureFlag {
  key: string;
  enabled?: boolean;
  value?: number | string | boolean;
}

export interface EffectiveFlags {
  ai_enabled: boolean;
  ai_daily_quota: number;
  ai_photo_enabled: boolean;
  respondeagro_enabled: boolean;
  agritec_enabled: boolean;
  satveg_enabled: boolean;
  [key: string]: boolean | number | string;
}

export interface AIAccessResult {
  allowed: boolean;
  reason: 'ok' | 'quota_exceeded' | 'disabled' | 'plan_limit' | 'no_workspace';
  remaining?: number;
  dailyLimit?: number;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}

// Default flags
const DEFAULT_FLAGS: EffectiveFlags = {
  ai_enabled: false,
  ai_daily_quota: 0,
  ai_photo_enabled: false,
  respondeagro_enabled: true,
  agritec_enabled: false,
  satveg_enabled: false,
};

// Plan-based quotas
const PLAN_QUOTAS: Record<WorkspacePlan, number> = {
  free: 0,
  premium: 150,
  enterprise: 500,
};

/**
 * Parse flag value from JSONB to typed value
 */
function parseFlagValue(valueJson: unknown): boolean | number | string {
  // Handle primitive values directly
  if (typeof valueJson === 'boolean') return valueJson;
  if (typeof valueJson === 'number') return valueJson;
  if (typeof valueJson === 'string') return valueJson;
  
  // Handle object format { enabled: true } or { value: X }
  if (valueJson && typeof valueJson === 'object') {
    const obj = valueJson as Record<string, unknown>;
    if ('enabled' in obj) return obj.enabled as boolean;
    if ('value' in obj) return obj.value as number | string;
  }
  
  return false;
}

/**
 * Get global feature flags from database
 */
export async function getGlobalFlags(): Promise<Partial<EffectiveFlags>> {
  const { data, error } = await supabase
    .from('feature_flags_global')
    .select('key, value_json');

  if (error) {
    console.error('[Entitlements] Error fetching global flags:', error);
    return {};
  }

  const flags: Partial<EffectiveFlags> = {};
  for (const row of data || []) {
    const key = row.key;
    const value = parseFlagValue(row.value_json as Record<string, unknown>);
    
    // Map quota keys
    if (key === 'ai_daily_quota_free' || key === 'ai_daily_quota_premium') {
      continue; // These are handled separately
    }
    
    flags[key] = value;
  }

  return flags;
}

/**
 * Get workspace-specific feature flags
 */
export async function getWorkspaceFlags(workspaceId: string): Promise<Partial<EffectiveFlags>> {
  const { data, error } = await supabase
    .from('feature_flags_workspace')
    .select('key, value_json')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[Entitlements] Error fetching workspace flags:', error);
    return {};
  }

  const flags: Partial<EffectiveFlags> = {};
  for (const row of data || []) {
    flags[row.key] = parseFlagValue(row.value_json as Record<string, unknown>);
  }

  return flags;
}

/**
 * Get active campaign flags for a workspace
 */
export async function getCampaignFlags(workspaceId: string): Promise<Partial<EffectiveFlags>> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('rule_json, payload_json')
    .eq('is_enabled', true)
    .lte('start_at', now)
    .or(`end_at.is.null,end_at.gte.${now}`);

  if (error) {
    console.error('[Entitlements] Error fetching campaigns:', error);
    return {};
  }

  const flags: Partial<EffectiveFlags> = {};
  
  for (const campaign of data || []) {
    const rules = campaign.rule_json as Record<string, unknown> | null;
    const payload = campaign.payload_json as Record<string, unknown> | null;
    
    // Check if campaign applies to this workspace
    if (rules) {
      const targetWorkspaces = rules.workspaces as string[] | undefined;
      if (targetWorkspaces && !targetWorkspaces.includes(workspaceId)) {
        continue;
      }
    }
    
    // Apply campaign payload as flags
    if (payload) {
      for (const [key, value] of Object.entries(payload)) {
        if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
          flags[key] = value;
        }
      }
    }
  }

  return flags;
}

/**
 * Get workspace plan
 */
export async function getWorkspacePlan(workspaceId: string): Promise<WorkspacePlan> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single();

  if (error || !data) {
    console.error('[Entitlements] Error fetching workspace plan:', error);
    return 'free';
  }

  return data.plan as WorkspacePlan;
}

/**
 * Get effective flags with priority: campaign > workspace > global > defaults
 */
export async function getEffectiveFlags(
  workspaceId: string | null,
  _userId?: string
): Promise<EffectiveFlags> {
  // Start with defaults
  let flags: EffectiveFlags = { ...DEFAULT_FLAGS };

  // Apply global flags
  const globalFlags = await getGlobalFlags();
  flags = { ...flags, ...globalFlags };

  if (workspaceId) {
    // Get workspace plan for quota
    const plan = await getWorkspacePlan(workspaceId);
    flags.ai_daily_quota = PLAN_QUOTAS[plan] || 0;

    // Apply workspace-specific flags
    const workspaceFlags = await getWorkspaceFlags(workspaceId);
    flags = { ...flags, ...workspaceFlags };

    // Apply campaign flags (highest priority)
    const campaignFlags = await getCampaignFlags(workspaceId);
    flags = { ...flags, ...campaignFlags };
  }

  return flags;
}

/**
 * Get AI usage for today
 */
export async function getTodayAIUsage(
  workspaceId: string,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('ai_usage_log')
    .select('requests')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today);

  if (error) {
    console.error('[Entitlements] Error fetching AI usage:', error);
    return 0;
  }

  return (data || []).reduce((sum, row) => sum + (row.requests || 0), 0);
}

/**
 * Get remaining AI quota for today
 */
export async function getRemainingAIQuota(
  workspaceId: string,
  userId: string
): Promise<QuotaInfo> {
  const flags = await getEffectiveFlags(workspaceId, userId);
  const used = await getTodayAIUsage(workspaceId, userId);
  const limit = flags.ai_daily_quota as number;

  // Calculate reset time (midnight UTC)
  const now = new Date();
  const resetAt = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetAt,
  };
}

/**
 * Check if user can use AI features
 */
export async function canUseAI(
  workspaceId: string | null,
  userId: string
): Promise<AIAccessResult> {
  if (!workspaceId) {
    return {
      allowed: false,
      reason: 'no_workspace',
    };
  }

  const flags = await getEffectiveFlags(workspaceId, userId);

  // Check if AI is enabled
  if (!flags.ai_enabled) {
    return {
      allowed: false,
      reason: 'disabled',
    };
  }

  // Check quota
  const quota = await getRemainingAIQuota(workspaceId, userId);

  if (quota.limit === 0) {
    return {
      allowed: false,
      reason: 'plan_limit',
      remaining: 0,
      dailyLimit: 0,
    };
  }

  if (quota.remaining <= 0) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      remaining: 0,
      dailyLimit: quota.limit,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    remaining: quota.remaining,
    dailyLimit: quota.limit,
  };
}

/**
 * Check if workspace has premium plan
 */
export function isPremium(plan: WorkspacePlan | string): boolean {
  return plan === 'premium' || plan === 'enterprise';
}

/**
 * Check if workspace has enterprise plan
 */
export function isEnterprise(plan: WorkspacePlan | string): boolean {
  return plan === 'enterprise';
}

/**
 * Check if Agritec integration is enabled
 */
export async function hasAgritec(workspaceId: string | null): Promise<boolean> {
  if (!workspaceId) return false;
  const flags = await getEffectiveFlags(workspaceId);
  return flags.agritec_enabled === true;
}

/**
 * Check if SatVeg integration is enabled
 */
export async function hasSatveg(workspaceId: string | null): Promise<boolean> {
  if (!workspaceId) return false;
  const flags = await getEffectiveFlags(workspaceId);
  return flags.satveg_enabled === true;
}

/**
 * Check if Photo AI is enabled
 */
export async function hasPhotoAI(workspaceId: string | null): Promise<boolean> {
  if (!workspaceId) return false;
  const flags = await getEffectiveFlags(workspaceId);
  return flags.ai_photo_enabled === true;
}

/**
 * Check if RespondeAgro is enabled
 */
export async function hasRespondeAgro(workspaceId: string | null): Promise<boolean> {
  if (!workspaceId) return false;
  const flags = await getEffectiveFlags(workspaceId);
  return flags.respondeagro_enabled === true;
}

/**
 * Increment AI usage (client-side helper that calls the edge function)
 */
export async function incrementAIUsage(
  workspaceId: string,
  source: string = 'chat',
  tokensIn: number = 0,
  tokensOut: number = 0
): Promise<boolean> {
  try {
    const { error } = await supabase.functions.invoke('ai-usage-increment', {
      body: {
        workspace_id: workspaceId,
        source,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      },
    });

    if (error) {
      console.error('[Entitlements] Error incrementing AI usage:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Entitlements] Error incrementing AI usage:', err);
    return false;
  }
}
