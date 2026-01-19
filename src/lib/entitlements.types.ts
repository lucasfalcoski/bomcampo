/**
 * Type definitions for entitlements module
 */

export type WorkspacePlan = 'free' | 'premium' | 'enterprise';
export type WorkspaceType = 'b2c' | 'b2b';
export type WorkspaceStatus = 'active' | 'inactive' | 'suspended';
export type WorkspaceRole = 'owner' | 'manager' | 'operator' | 'agronomist' | 'viewer';
export type SystemRole = 'superadmin' | 'support' | 'ops';

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

export interface WorkspaceInfo {
  id: string;
  name: string;
  type: WorkspaceType;
  status: WorkspaceStatus;
  plan: WorkspacePlan;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
}

export interface EntitlementsResponse {
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
  };
  features: {
    premium: boolean;
    enterprise: boolean;
    agritec: boolean;
    satveg: boolean;
    photoAI: boolean;
    respondeAgro: boolean;
  };
}
