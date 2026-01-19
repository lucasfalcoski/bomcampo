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
  ai_admin_bypass: boolean;
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
  bypass?: boolean;
  debug?: AIDebugInfo;
}

export interface AIDebugInfo {
  limit: number;
  used: number;
  remaining: number;
  plan_used: 'free' | 'premium';
  limit_source: 'campaign' | 'workspace' | 'global' | 'default';
  bypass: boolean;
  is_superadmin: boolean;
  ai_admin_bypass_flag: boolean;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  debug?: AIDebugInfo;
}

// Default flags
const DEFAULT_FLAGS: EffectiveFlags = {
  ai_enabled: false,
  ai_daily_quota: 0,
  ai_photo_enabled: false,
  ai_admin_bypass: false,
  respondeagro_enabled: true,
  agritec_enabled: false,
  satveg_enabled: false,
};

// Default quotas per plan
const DEFAULT_PLAN_QUOTAS = {
  free: 10,
  premium: 150,
  enterprise: 500,
};

/**
 * Get current date in BRT (America/Sao_Paulo)
 */
function getTodayBRT(): string {
  const now = new Date();
  const brtOffset = -3 * 60; // BRT is UTC-3
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
}

/**
 * Safely parse numeric flag values from various formats
 */
function parseNumericFlag(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    // Handle { value: X } format
    if ('value' in obj) {
      const parsed = Number(obj.value);
      if (!isNaN(parsed)) return parsed;
    }
    // Handle { enabled: true } for boolean-like flags stored as objects
    if ('enabled' in obj && typeof obj.enabled === 'number') {
      return obj.enabled;
    }
  }
  return fallback;
}

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
export async function getGlobalFlags(): Promise<{
  flags: Partial<EffectiveFlags>;
  quotaFree: number | null;
  quotaPremium: number | null;
}> {
  const { data, error } = await supabase
    .from('feature_flags_global')
    .select('key, value_json');

  if (error) {
    console.error('[Entitlements] Error fetching global flags:', error);
    return { flags: {}, quotaFree: null, quotaPremium: null };
  }

  const flags: Partial<EffectiveFlags> = {};
  let quotaFree: number | null = null;
  let quotaPremium: number | null = null;

  for (const row of data || []) {
    const key = row.key;
    const rawValue = row.value_json;
    
    // Handle quota keys specifically
    if (key === 'ai_daily_quota_free') {
      quotaFree = parseNumericFlag(rawValue, DEFAULT_PLAN_QUOTAS.free);
      continue;
    }
    if (key === 'ai_daily_quota_premium') {
      quotaPremium = parseNumericFlag(rawValue, DEFAULT_PLAN_QUOTAS.premium);
      continue;
    }
    
    flags[key] = parseFlagValue(rawValue);
  }

  return { flags, quotaFree, quotaPremium };
}

/**
 * Get workspace-specific feature flags
 */
export async function getWorkspaceFlags(workspaceId: string): Promise<{
  flags: Partial<EffectiveFlags>;
  quotaOverride: number | null;
}> {
  const { data, error } = await supabase
    .from('feature_flags_workspace')
    .select('key, value_json')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[Entitlements] Error fetching workspace flags:', error);
    return { flags: {}, quotaOverride: null };
  }

  const flags: Partial<EffectiveFlags> = {};
  let quotaOverride: number | null = null;

  for (const row of data || []) {
    const key = row.key;
    const rawValue = row.value_json;
    
    // Handle workspace-level quota override
    if (key === 'ai_daily_quota') {
      quotaOverride = parseNumericFlag(rawValue, 0);
      continue;
    }
    
    flags[key] = parseFlagValue(rawValue);
  }

  return { flags, quotaOverride };
}

/**
 * Get active campaign flags for a workspace
 */
export async function getCampaignFlags(workspaceId: string): Promise<{
  flags: Partial<EffectiveFlags>;
  quotaOverride: number | null;
}> {
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from('campaigns')
    .select('rule_json, payload_json')
    .eq('is_enabled', true)
    .lte('start_at', now)
    .or(`end_at.is.null,end_at.gte.${now}`);

  if (error) {
    console.error('[Entitlements] Error fetching campaigns:', error);
    return { flags: {}, quotaOverride: null };
  }

  const flags: Partial<EffectiveFlags> = {};
  let quotaOverride: number | null = null;
  
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
        // Handle quota override from campaign
        if (key === 'ai_daily_quota') {
          quotaOverride = parseNumericFlag(value, 0);
          continue;
        }
        
        if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
          flags[key] = value;
        }
      }
    }
  }

  return { flags, quotaOverride };
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
 * Check if user is a superadmin
 */
export async function checkIsSuperadmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_system_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'superadmin')
    .maybeSingle();

  if (error) {
    console.error('[Entitlements] Error checking superadmin:', error);
    return false;
  }
  return !!data;
}

interface EffectiveFlagsResult {
  flags: EffectiveFlags;
  debug: {
    limit: number;
    plan_used: 'free' | 'premium';
    limit_source: 'campaign' | 'workspace' | 'global' | 'default';
  };
}

/**
 * Get effective flags with priority: campaign > workspace > global > defaults
 * Also returns debug info about which quota was applied
 */
export async function getEffectiveFlags(
  workspaceId: string | null,
  _userId?: string
): Promise<EffectiveFlags> {
  const result = await getEffectiveFlagsWithDebug(workspaceId);
  return result.flags;
}

/**
 * Get effective flags with debug information
 */
export async function getEffectiveFlagsWithDebug(
  workspaceId: string | null
): Promise<EffectiveFlagsResult> {
  // Start with defaults
  let flags: EffectiveFlags = { ...DEFAULT_FLAGS };
  let limit = DEFAULT_PLAN_QUOTAS.free;
  let planUsed: 'free' | 'premium' = 'free';
  let limitSource: 'campaign' | 'workspace' | 'global' | 'default' = 'default';

  // Apply global flags
  const { flags: globalFlags, quotaFree, quotaPremium } = await getGlobalFlags();
  flags = { ...flags, ...globalFlags };

  if (workspaceId) {
    // Get workspace plan for quota
    const plan = await getWorkspacePlan(workspaceId);
    const isPremiumPlan = plan === 'premium' || plan === 'enterprise';
    planUsed = isPremiumPlan ? 'premium' : 'free';

    // Determine base limit from global flags or defaults
    if (isPremiumPlan) {
      limit = quotaPremium ?? DEFAULT_PLAN_QUOTAS.premium;
    } else {
      limit = quotaFree ?? DEFAULT_PLAN_QUOTAS.free;
    }
    if (quotaFree !== null || quotaPremium !== null) {
      limitSource = 'global';
    }

    // Apply workspace-specific flags (can override quota)
    const { flags: workspaceFlags, quotaOverride: wsQuotaOverride } = await getWorkspaceFlags(workspaceId);
    flags = { ...flags, ...workspaceFlags };
    
    if (wsQuotaOverride !== null && wsQuotaOverride > 0) {
      limit = wsQuotaOverride;
      limitSource = 'workspace';
    }

    // Apply campaign flags (highest priority, can override quota)
    const { flags: campaignFlags, quotaOverride: campQuotaOverride } = await getCampaignFlags(workspaceId);
    flags = { ...flags, ...campaignFlags };
    
    if (campQuotaOverride !== null && campQuotaOverride > 0) {
      limit = campQuotaOverride;
      limitSource = 'campaign';
    }
  }

  // Set the final quota on the flags object
  flags.ai_daily_quota = limit;

  return {
    flags,
    debug: {
      limit,
      plan_used: planUsed,
      limit_source: limitSource,
    },
  };
}

/**
 * Get AI usage for today (using BRT timezone)
 * Counts total requests across ALL sources (not per-source)
 */
export async function getTodayAIUsage(
  workspaceId: string,
  userId: string
): Promise<number> {
  const today = getTodayBRT();

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

  // Sum all requests across all sources
  return (data || []).reduce((sum, row) => sum + (row.requests || 0), 0);
}

/**
 * Get remaining AI quota for today with debug info
 */
export async function getRemainingAIQuota(
  workspaceId: string,
  userId: string
): Promise<QuotaInfo> {
  const { flags, debug: flagDebug } = await getEffectiveFlagsWithDebug(workspaceId);
  const used = await getTodayAIUsage(workspaceId, userId);
  const limit = flagDebug.limit;

  // Check for superadmin bypass
  const isSuperadmin = await checkIsSuperadmin(userId);
  const hasAdminBypass = flags.ai_admin_bypass === true;
  const bypass = isSuperadmin && hasAdminBypass;

  // Calculate reset time (midnight BRT - approximately 3:00 UTC)
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  
  // Next midnight in BRT
  const resetAt = new Date(Date.UTC(
    brtTime.getUTCFullYear(),
    brtTime.getUTCMonth(),
    brtTime.getUTCDate() + 1,
    3, 0, 0, 0 // 3:00 UTC = 00:00 BRT
  ));

  return {
    used,
    limit,
    remaining: bypass ? 999 : Math.max(0, limit - used),
    resetAt,
    debug: {
      limit,
      used,
      remaining: Math.max(0, limit - used),
      plan_used: flagDebug.plan_used,
      limit_source: flagDebug.limit_source,
      bypass,
      is_superadmin: isSuperadmin,
      ai_admin_bypass_flag: hasAdminBypass,
    },
  };
}

/**
 * Check if user can use AI features
 * Returns detailed info including debug for superadmins
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

  const { flags, debug: flagDebug } = await getEffectiveFlagsWithDebug(workspaceId);

  // Check if AI is enabled
  if (!flags.ai_enabled) {
    return {
      allowed: false,
      reason: 'disabled',
    };
  }

  // Check for superadmin + admin bypass
  const isSuperadmin = await checkIsSuperadmin(userId);
  const hasAdminBypass = flags.ai_admin_bypass === true;
  const bypass = isSuperadmin && hasAdminBypass;

  // Get usage info
  const used = await getTodayAIUsage(workspaceId, userId);
  const limit = flagDebug.limit;
  const remaining = bypass ? 999 : Math.max(0, limit - used);

  const debug: AIDebugInfo = {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    plan_used: flagDebug.plan_used,
    limit_source: flagDebug.limit_source,
    bypass,
    is_superadmin: isSuperadmin,
    ai_admin_bypass_flag: hasAdminBypass,
  };

  // If bypass is active, always allow
  if (bypass) {
    console.log('[Entitlements] AI quota bypassed - superadmin:', isSuperadmin, 'admin_bypass:', hasAdminBypass);
    return {
      allowed: true,
      reason: 'ok',
      remaining: 999,
      dailyLimit: limit,
      bypass: true,
      debug: isSuperadmin ? debug : undefined,
    };
  }

  // Check quota
  if (limit === 0) {
    return {
      allowed: false,
      reason: 'plan_limit',
      remaining: 0,
      dailyLimit: 0,
      debug: isSuperadmin ? debug : undefined,
    };
  }

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      remaining: 0,
      dailyLimit: limit,
      debug: isSuperadmin ? debug : undefined,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    remaining,
    dailyLimit: limit,
    debug: isSuperadmin ? debug : undefined,
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
 * This should only be called ONCE per user question
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
