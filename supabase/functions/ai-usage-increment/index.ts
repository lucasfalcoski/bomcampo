import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncrementRequest {
  workspace_id: string;
  source?: string;
  tokens_in?: number;
  tokens_out?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Parse request body
    const body: IncrementRequest = await req.json();
    const { workspace_id, source = "chat", tokens_in = 0, tokens_out = 0 } = body;

    // Validate workspace_id
    if (!workspace_id) {
      return new Response(JSON.stringify({ error: "workspace_id is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Validate source
    const validSources = ["chat", "photo", "suggest", "analyze"];
    const sanitizedSource = validSources.includes(source) ? source : "chat";

    // Validate tokens (prevent negative values)
    const sanitizedTokensIn = Math.max(0, Math.floor(tokens_in));
    const sanitizedTokensOut = Math.max(0, Math.floor(tokens_out));

    // Use service role to insert/update usage
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user is member of workspace
    const { data: membership } = await supabaseAdmin
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return new Response(JSON.stringify({ error: "User is not a member of this workspace" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const today = new Date().toISOString().split("T")[0];

    // Check if record exists for today
    const { data: existingUsage } = await supabaseAdmin
      .from("ai_usage_log")
      .select("id, requests, tokens_in, tokens_out")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .eq("day", today)
      .eq("source", sanitizedSource)
      .single();

    let newRequests = 1;
    let newTokensIn = sanitizedTokensIn;
    let newTokensOut = sanitizedTokensOut;

    if (existingUsage) {
      // Update existing record
      newRequests = (existingUsage.requests || 0) + 1;
      newTokensIn = (existingUsage.tokens_in || 0) + sanitizedTokensIn;
      newTokensOut = (existingUsage.tokens_out || 0) + sanitizedTokensOut;

      const { error: updateError } = await supabaseAdmin
        .from("ai_usage_log")
        .update({
          requests: newRequests,
          tokens_in: newTokensIn,
          tokens_out: newTokensOut,
        })
        .eq("id", existingUsage.id);

      if (updateError) {
        console.error("[ai-usage-increment] Update error:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update usage" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    } else {
      // Insert new record
      const { error: insertError } = await supabaseAdmin
        .from("ai_usage_log")
        .insert({
          workspace_id,
          user_id: user.id,
          day: today,
          source: sanitizedSource,
          requests: 1,
          tokens_in: sanitizedTokensIn,
          tokens_out: sanitizedTokensOut,
        });

      if (insertError) {
        console.error("[ai-usage-increment] Insert error:", insertError);
        return new Response(JSON.stringify({ error: "Failed to insert usage" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // Get total usage for today across all sources
    const { data: totalUsage } = await supabaseAdmin
      .from("ai_usage_log")
      .select("requests")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .eq("day", today);

    const totalRequests = (totalUsage || []).reduce((sum, row) => sum + (row.requests || 0), 0);

    console.log(
      "[ai-usage-increment] User:",
      user.id,
      "Workspace:",
      workspace_id,
      "Source:",
      sanitizedSource,
      "Total today:",
      totalRequests
    );

    return new Response(
      JSON.stringify({
        success: true,
        usage: {
          source: sanitizedSource,
          requests: newRequests,
          tokens_in: newTokensIn,
          tokens_out: newTokensOut,
          total_today: totalRequests,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[ai-usage-increment] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
