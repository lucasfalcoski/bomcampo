/**
 * Entitlements & Quota Module
 * Centralized permission and quota management for B2C/B2B multi-tenant
 * 
 * IMPORTANT: This module now fetches entitlements via Edge Function to bypass RLS.
 * Normal users cannot SELECT from feature_flags_* tables directly.
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
  reason: 'ok' | 'quota_exceeded' | 'disabled' | 'plan_limit' | 'no_workspace' | 'fetch_error';
  remaining?: number;
  dailyLimit?: number;
  bypass?: boolean;
  debug?: AIDebugInfo;
  debug_reason?: string;
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
  workspace_id: string | null;
  ai_enabled_raw?: unknown;
  ai_enabled_normalized?: boolean;
  debug_reason?: string;
  source_map?: Record<string, string>;
  raw_values?: Record<string, unknown>;
}

export interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  debug?: AIDebugInfo;
}

// Default flags (used as fallback)
const DEFAULT_FLAGS: EffectiveFlags = {
  ai_enabled: false,
  ai_daily_quota: 0,
  ai_photo_enabled: false,
  ai_admin_bypass: false,
  respondeagro_enabled: true,
  agritec_enabled: false,
  satveg_enabled: false,
};

// Cache for entitlements API response
interface EntitlementsCacheEntry {
  data: EntitlementsResponse;
  timestamp: number;
}

interface EntitlementsResponse {
  workspace_id: string | null;
  flags: EffectiveFlags;
  workspace: {
    id: string | null;
    plan: string;
  };
  ai: {
    allowed: boolean;
    reason: string;
    used: number;
    limit: number;
    remaining: number;
    bypass?: boolean;
  };
  features: {
    premium: boolean;
    enterprise: boolean;
    agritec: boolean;
    satveg: boolean;
    photoAI: boolean;
    respondeAgro: boolean;
  };
  meta?: {
    source_map?: Record<string, string>;
    limit_source?: string;
    debug?: {
      is_superadmin?: boolean;
      ai_admin_bypass_flag?: boolean;
      debug_reason?: string;
      raw_values?: Record<string, unknown>;
    };
  };
}

const CACHE_TTL_MS = 30000; // 30 seconds cache
const entitlementsCache = new Map<string, EntitlementsCacheEntry>();

/**
 * Normalize flag value from various JSONB formats to a clean primitive
 * Handles: boolean, number, string, {enabled:X}, {value:X}, {is_enabled:X}, "true"/"false"
 */
export function normalizeFlagValue(valueJson: unknown): boolean | number | string | undefined {
  // Null/undefined
  if (valueJson === null || valueJson === undefined) return undefined;
  
  // Direct boolean
  if (typeof valueJson === 'boolean') return valueJson;
  
  // Direct number
  if (typeof valueJson === 'number') return valueJson;
  
  // String - check for boolean-like strings
  if (typeof valueJson === 'string') {
    const lower = valueJson.toLowerCase().trim();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
    // Could be a numeric string
    const num = Number(valueJson);
    if (!isNaN(num)) return num;
    return valueJson;
  }
  
  // Object format - check common keys
  if (valueJson && typeof valueJson === 'object') {
    const obj = valueJson as Record<string, unknown>;
    
    // Priority: enabled > is_enabled > value
    if ('enabled' in obj) {
      return normalizeFlagValue(obj.enabled);
    }
    if ('is_enabled' in obj) {
      return normalizeFlagValue(obj.is_enabled);
    }
    if ('value' in obj) {
      return normalizeFlagValue(obj.value);
    }
  }
  
  // Unknown format - return undefined
  return undefined;
}

/**
 * Fetch entitlements from Edge Function (bypasses RLS)
 * Uses in-memory cache to avoid repeated calls
 */
export async function fetchEntitlements(workspaceId?: string | null): Promise<EntitlementsResponse | null> {
  const cacheKey = workspaceId || '_auto_';
  const cached = entitlementsCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    console.log('[Entitlements] Using cached response for:', cacheKey);
    return cached.data;
  }

  try {
    // Get the current session for auth header
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('[Entitlements] No session, cannot fetch entitlements');
      return null;
    }

    const queryParams = workspaceId ? `?workspace_id=${workspaceId}` : '';
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/entitlements${queryParams}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Entitlements] API error:', response.status, errorText);
      return null;
    }

    const data = await response.json() as EntitlementsResponse;
    
    // Cache the response
    entitlementsCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    console.log('[Entitlements] Fetched from API:', data.workspace_id, 'ai_enabled:', data.flags.ai_enabled);
    return data;
  } catch (error) {
    console.error('[Entitlements] Error fetching entitlements:', error);
    return null;
  }
}

/**
 * Clear entitlements cache (useful after making changes)
 */
export function clearEntitlementsCache(): void {
  entitlementsCache.clear();
}

/**
 * Get effective flags via Edge Function
 * This is the main entry point for getting entitlements
 */
export async function getEffectiveFlags(
  workspaceId: string | null,
  _userId?: string
): Promise<EffectiveFlags> {
  const response = await fetchEntitlements(workspaceId);
  
  if (!response) {
    console.warn('[Entitlements] Failed to fetch, using defaults');
    return { ...DEFAULT_FLAGS };
  }
  
  return response.flags;
}

/**
 * Check if user can use AI features
 * Uses Edge Function to bypass RLS
 */
export async function canUseAI(
  workspaceId: string | null,
  userId: string
): Promise<AIAccessResult> {
  if (!workspaceId) {
    // Try to fetch without workspace - API will auto-select first workspace
    const response = await fetchEntitlements(null);
    
    if (!response || !response.workspace_id) {
      return {
        allowed: false,
        reason: 'no_workspace',
      };
    }
    
    // Use the auto-selected workspace
    workspaceId = response.workspace_id;
  }

  const response = await fetchEntitlements(workspaceId);
  
  if (!response) {
    return {
      allowed: false,
      reason: 'fetch_error',
      debug_reason: 'Failed to fetch entitlements from API',
    };
  }

  const { ai, flags, meta } = response;
  const isSuperadmin = meta?.debug?.is_superadmin || false;

  // Build debug info if superadmin
  const debug: AIDebugInfo | undefined = isSuperadmin ? {
    limit: ai.limit,
    used: ai.used,
    remaining: ai.remaining,
    plan_used: response.workspace.plan === 'premium' || response.workspace.plan === 'enterprise' ? 'premium' : 'free',
    limit_source: (meta?.limit_source as 'campaign' | 'workspace' | 'global' | 'default') || 'default',
    bypass: ai.bypass || false,
    is_superadmin: true,
    ai_admin_bypass_flag: meta?.debug?.ai_admin_bypass_flag || false,
    workspace_id: workspaceId,
    ai_enabled_raw: flags.ai_enabled,
    ai_enabled_normalized: flags.ai_enabled === true,
    debug_reason: meta?.debug?.debug_reason,
    source_map: meta?.source_map,
    raw_values: meta?.debug?.raw_values,
  } : undefined;

  return {
    allowed: ai.allowed,
    reason: ai.reason as AIAccessResult['reason'],
    remaining: ai.remaining,
    dailyLimit: ai.limit,
    bypass: ai.bypass,
    debug,
    debug_reason: meta?.debug?.debug_reason,
  };
}

/**
 * Get remaining AI quota for today
 */
export async function getRemainingAIQuota(
  workspaceId: string,
  userId: string
): Promise<QuotaInfo> {
  const response = await fetchEntitlements(workspaceId);
  
  if (!response) {
    // Return empty quota on error
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
  }

  const { ai, meta } = response;
  const isSuperadmin = meta?.debug?.is_superadmin || false;
  
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

  const debug: AIDebugInfo | undefined = isSuperadmin ? {
    limit: ai.limit,
    used: ai.used,
    remaining: ai.remaining,
    plan_used: response.workspace.plan === 'premium' || response.workspace.plan === 'enterprise' ? 'premium' : 'free',
    limit_source: (meta?.limit_source as 'campaign' | 'workspace' | 'global' | 'default') || 'default',
    bypass: ai.bypass || false,
    is_superadmin: true,
    ai_admin_bypass_flag: meta?.debug?.ai_admin_bypass_flag || false,
    workspace_id: workspaceId,
  } : undefined;

  return {
    used: ai.used,
    limit: ai.limit,
    remaining: ai.remaining,
    resetAt,
    debug,
  };
}

/**
 * Check if user is a superadmin (still needs direct query for some cases)
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

    // Clear cache so next fetch gets fresh data
    clearEntitlementsCache();

    return true;
  } catch (err) {
    console.error('[Entitlements] Error incrementing AI usage:', err);
    return false;
  }
}
