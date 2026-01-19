import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeatureFlag {
  key: string;
  value_json: Record<string, unknown>;
}

interface EffectiveFlags {
  ai_enabled: boolean;
  ai_daily_quota: number;
  ai_photo_enabled: boolean;
  respondeagro_enabled: boolean;
  agritec_enabled: boolean;
  satveg_enabled: boolean;
  [key: string]: boolean | number | string;
}

const DEFAULT_FLAGS: EffectiveFlags = {
  ai_enabled: false,
  ai_daily_quota: 0,
  ai_photo_enabled: false,
  respondeagro_enabled: true,
  agritec_enabled: false,
  satveg_enabled: false,
};

const PLAN_QUOTAS: Record<string, number> = {
  free: 0,
  premium: 150,
  enterprise: 500,
};

function parseFlagValue(valueJson: Record<string, unknown>): boolean | number | string {
  if ("enabled" in valueJson) return valueJson.enabled as boolean;
  if ("value" in valueJson) return valueJson.value as number | string;
  return false;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const workspaceId = url.searchParams.get("workspace_id");

    // Create Supabase client with service role for reading flags
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false },
        }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Start with defaults
    let flags: EffectiveFlags = { ...DEFAULT_FLAGS };

    // Fetch global flags
    const { data: globalFlags } = await supabaseAdmin
      .from("feature_flags_global")
      .select("key, value_json");

    if (globalFlags) {
      for (const row of globalFlags as FeatureFlag[]) {
        const key = row.key;
        if (key === "ai_daily_quota_free" || key === "ai_daily_quota_premium") {
          continue;
        }
        flags[key] = parseFlagValue(row.value_json);
      }
    }

    let workspacePlan = "free";
    let aiUsedToday = 0;

    if (workspaceId) {
      // Get workspace plan
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("plan")
        .eq("id", workspaceId)
        .single();

      if (workspace) {
        workspacePlan = workspace.plan;
        flags.ai_daily_quota = PLAN_QUOTAS[workspacePlan] || 0;
      }

      // Fetch workspace flags
      const { data: wsFlags } = await supabaseAdmin
        .from("feature_flags_workspace")
        .select("key, value_json")
        .eq("workspace_id", workspaceId);

      if (wsFlags) {
        for (const row of wsFlags as FeatureFlag[]) {
          flags[row.key] = parseFlagValue(row.value_json);
        }
      }

      // Fetch active campaigns
      const now = new Date().toISOString();
      const { data: campaigns } = await supabaseAdmin
        .from("campaigns")
        .select("rule_json, payload_json")
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
              if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
                flags[key] = value;
              }
            }
          }
        }
      }

      // Get AI usage for today if user is authenticated
      if (userId) {
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
    }

    // Calculate AI access
    const aiDailyQuota = flags.ai_daily_quota as number;
    const aiRemaining = Math.max(0, aiDailyQuota - aiUsedToday);
    let aiReason: string = "ok";

    if (!flags.ai_enabled) {
      aiReason = "disabled";
    } else if (aiDailyQuota === 0) {
      aiReason = "plan_limit";
    } else if (aiRemaining <= 0) {
      aiReason = "quota_exceeded";
    }

    const response = {
      flags,
      workspace: {
        id: workspaceId,
        plan: workspacePlan,
      },
      ai: {
        allowed: flags.ai_enabled && aiRemaining > 0,
        reason: aiReason,
        used: aiUsedToday,
        limit: aiDailyQuota,
        remaining: aiRemaining,
      },
      features: {
        premium: workspacePlan === "premium" || workspacePlan === "enterprise",
        enterprise: workspacePlan === "enterprise",
        agritec: flags.agritec_enabled === true,
        satveg: flags.satveg_enabled === true,
        photoAI: flags.ai_photo_enabled === true,
        respondeAgro: flags.respondeagro_enabled === true,
      },
    };

    console.log("[entitlements] Response for workspace:", workspaceId, "user:", userId);

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
