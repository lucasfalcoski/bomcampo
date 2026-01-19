import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeatureFlag {
  key: string;
  value_json: unknown;
}

interface EffectiveFlags {
  ai_enabled: boolean;
  ai_daily_quota: number;
  ai_photo_enabled: boolean;
  ai_admin_bypass: boolean;
  respondeagro_enabled: boolean;
  agritec_enabled: boolean;
  satveg_enabled: boolean;
  [key: string]: boolean | number | string;
}

const DEFAULT_FLAGS: EffectiveFlags = {
  ai_enabled: false,
  ai_daily_quota: 0,
  ai_photo_enabled: false,
  ai_admin_bypass: false,
  respondeagro_enabled: true,
  agritec_enabled: false,
  satveg_enabled: false,
};

const PLAN_QUOTAS: Record<string, number> = {
  free: 10,
  premium: 150,
  enterprise: 500,
};

/**
 * Normalize flag value from various JSONB formats to a clean primitive
 * Handles: boolean, number, string, {enabled:X}, {value:X}, {is_enabled:X}, "true"/"false"
 */
function normalizeFlagValue(valueJson: unknown): boolean | number | string | undefined {
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
 * Parse flag value with fallback
 */
function parseFlagValue(valueJson: unknown): boolean | number | string {
  const normalized = normalizeFlagValue(valueJson);
  if (normalized === undefined) return false;
  return normalized;
}

/**
 * Parse numeric flag value
 */
function parseNumericFlag(value: unknown, fallback: number): number {
  const normalized = normalizeFlagValue(value);
  if (typeof normalized === 'number') return normalized;
  if (typeof normalized === 'string') {
    const num = Number(normalized);
    if (!isNaN(num)) return num;
  }
  return fallback;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let workspaceId = url.searchParams.get("workspace_id");

    // Create Supabase client with service role for reading flags (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header (required)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify the user token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = user.id;

    // If no workspace_id provided, get the user's first workspace
    if (!workspaceId) {
      const { data: memberData } = await supabaseAdmin
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (memberData) {
        workspaceId = memberData.workspace_id;
      }
    }

    // Validate user is member of the workspace (if workspace exists)
    if (workspaceId) {
      const { data: memberCheck } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .single();

      if (!memberCheck) {
        return new Response(
          JSON.stringify({ error: "Not a member of this workspace" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
    }

    // Check if user is superadmin
    const { data: superadminData } = await supabaseAdmin
      .from("user_system_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "superadmin")
      .maybeSingle();
    
    const isSuperadmin = !!superadminData;

    // Start with defaults
    let flags: EffectiveFlags = { ...DEFAULT_FLAGS };
    const sourceMap: Record<string, string> = {};
    const rawValues: Record<string, unknown> = {};
    let quotaFree: number | null = null;
    let quotaPremium: number | null = null;

    // Fetch global flags
    const { data: globalFlags } = await supabaseAdmin
      .from("feature_flags_global")
      .select("key, value_json");

    if (globalFlags) {
      for (const row of globalFlags as FeatureFlag[]) {
        const key = row.key;
        const rawValue = row.value_json;
        
        // Track raw value for debugging
        rawValues[`global.${key}`] = rawValue;
        
        // Handle quota keys specifically
        if (key === "ai_daily_quota_free") {
          quotaFree = parseNumericFlag(rawValue, PLAN_QUOTAS.free);
          continue;
        }
        if (key === "ai_daily_quota_premium") {
          quotaPremium = parseNumericFlag(rawValue, PLAN_QUOTAS.premium);
          continue;
        }
        
        const normalizedValue = parseFlagValue(rawValue);
        flags[key] = normalizedValue;
        sourceMap[key] = "global";
      }
    }

    let workspacePlan = "free";
    let aiUsedToday = 0;
    let limitSource: "global" | "workspace" | "campaign" | "default" = quotaFree !== null || quotaPremium !== null ? "global" : "default";

    if (workspaceId) {
      // Get workspace plan
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("plan")
        .eq("id", workspaceId)
        .single();

      if (workspace) {
        workspacePlan = workspace.plan;
        const isPremiumPlan = workspacePlan === "premium" || workspacePlan === "enterprise";
        
        if (isPremiumPlan) {
          flags.ai_daily_quota = quotaPremium ?? PLAN_QUOTAS.premium;
        } else {
          flags.ai_daily_quota = quotaFree ?? PLAN_QUOTAS.free;
        }
      }

      // Fetch workspace flags (overrides global)
      const { data: wsFlags } = await supabaseAdmin
        .from("feature_flags_workspace")
        .select("key, value_json")
        .eq("workspace_id", workspaceId);

      if (wsFlags) {
        for (const row of wsFlags as FeatureFlag[]) {
          const key = row.key;
          const rawValue = row.value_json;
          
          rawValues[`workspace.${key}`] = rawValue;
          
          // Handle workspace-level quota override
          if (key === "ai_daily_quota") {
            const override = parseNumericFlag(rawValue, 0);
            if (override > 0) {
              flags.ai_daily_quota = override;
              limitSource = "workspace";
            }
            continue;
          }
          
          flags[key] = parseFlagValue(rawValue);
          sourceMap[key] = "workspace";
        }
      }

      // Fetch active campaigns (highest priority override)
      const now = new Date().toISOString();
      const { data: campaigns } = await supabaseAdmin
        .from("campaigns")
        .select("name, rule_json, payload_json")
        .eq("is_enabled", true)
        .lte("start_at", now)
        .or(`end_at.is.null,end_at.gte.${now}`);

      if (campaigns) {
        for (const campaign of campaigns) {
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
              rawValues[`campaign.${key}`] = value;
              
              // Handle quota override from campaign
              if (key === "ai_daily_quota") {
                const override = parseNumericFlag(value, 0);
                if (override > 0) {
                  flags.ai_daily_quota = override;
                  limitSource = "campaign";
                }
                continue;
              }
              
              const normalizedValue = normalizeFlagValue(value);
              if (normalizedValue !== undefined) {
                flags[key] = normalizedValue;
                sourceMap[key] = `campaign:${campaign.name}`;
              }
            }
          }
        }
      }

      // Get AI usage for today if user is authenticated
      const today = new Date().toISOString().split("T")[0];
      const { data: usageData } = await supabaseAdmin
        .from("ai_usage_log")
        .select("requests")
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .eq("day", today);

      if (usageData) {
        aiUsedToday = usageData.reduce((sum, row) => sum + (row.requests || 0), 0);
      }
    }

    // Calculate AI access
    const aiDailyQuota = flags.ai_daily_quota as number;
    const aiRemaining = Math.max(0, aiDailyQuota - aiUsedToday);
    const hasAdminBypass = flags.ai_admin_bypass === true;
    const bypass = isSuperadmin && hasAdminBypass;
    
    let aiReason: string = "ok";
    let debugReason = "";

    if (!flags.ai_enabled) {
      aiReason = "disabled";
      if (sourceMap.ai_enabled?.startsWith("campaign:")) {
        debugReason = `campaign override: ai_enabled=false (${sourceMap.ai_enabled})`;
      } else if (sourceMap.ai_enabled === "workspace") {
        debugReason = "workspace flag: ai_enabled=false";
      } else if (sourceMap.ai_enabled === "global") {
        debugReason = "global flag: ai_enabled=false";
      } else {
        debugReason = "ai_enabled not set (default=false)";
      }
    } else if (aiDailyQuota === 0) {
      aiReason = "plan_limit";
      debugReason = "ai_daily_quota is 0";
    } else if (aiRemaining <= 0 && !bypass) {
      aiReason = "quota_exceeded";
      debugReason = `used ${aiUsedToday} of ${aiDailyQuota} daily quota`;
    }

    const response: Record<string, unknown> = {
      workspace_id: workspaceId,
      flags,
      workspace: {
        id: workspaceId,
        plan: workspacePlan,
      },
      ai: {
        allowed: bypass || (flags.ai_enabled && aiRemaining > 0),
        reason: aiReason,
        used: aiUsedToday,
        limit: aiDailyQuota,
        remaining: bypass ? 999 : aiRemaining,
        bypass,
      },
      features: {
        premium: workspacePlan === "premium" || workspacePlan === "enterprise",
        enterprise: workspacePlan === "enterprise",
        agritec: flags.agritec_enabled === true,
        satveg: flags.satveg_enabled === true,
        photoAI: flags.ai_photo_enabled === true,
        respondeAgro: flags.respondeagro_enabled === true,
      },
      meta: {
        source_map: sourceMap,
        limit_source: limitSource,
      },
    };

    // Include debug info for superadmins
    if (isSuperadmin) {
      response.meta = {
        ...response.meta as Record<string, unknown>,
        debug: {
          is_superadmin: true,
          ai_admin_bypass_flag: hasAdminBypass,
          debug_reason: debugReason,
          raw_values: rawValues,
        },
      };
    }

    console.log("[entitlements] Response for workspace:", workspaceId, "user:", userId, "ai_enabled:", flags.ai_enabled, "reason:", aiReason);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[entitlements] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
