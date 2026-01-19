import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  user_id: string;
  workspace_id: string;
}

/**
 * Get current date in BRT (America/Sao_Paulo)
 */
function getTodayBRT(): string {
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check if caller is superadmin
    const { data: adminRole } = await supabase
      .from('user_system_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'superadmin')
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden - superadmin only" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Parse request body
    const body: ResetRequest = await req.json();
    const { user_id, workspace_id } = body;

    if (!user_id || !workspace_id) {
      return new Response(JSON.stringify({ error: "user_id and workspace_id are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const today = getTodayBRT();

    // Reset usage for today - set requests to 0
    const { data: existingRecords, error: fetchError } = await supabase
      .from('ai_usage_log')
      .select('id, source, requests')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)
      .eq('day', today);

    if (fetchError) {
      console.error('[ai-reset-today] Fetch error:', fetchError);
      return new Response(JSON.stringify({ error: "Failed to fetch usage records" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    let resetCount = 0;
    let previousTotal = 0;

    if (existingRecords && existingRecords.length > 0) {
      previousTotal = existingRecords.reduce((sum, r) => sum + (r.requests || 0), 0);
      
      // Update all records for today to 0
      const { error: updateError } = await supabase
        .from('ai_usage_log')
        .update({ requests: 0 })
        .eq('workspace_id', workspace_id)
        .eq('user_id', user_id)
        .eq('day', today);

      if (updateError) {
        console.error('[ai-reset-today] Update error:', updateError);
        return new Response(JSON.stringify({ error: "Failed to reset usage" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      resetCount = existingRecords.length;
    }

    // Log the action in admin audit
    await supabase.from('admin_audit_log').insert({
      admin_user_id: user.id,
      action: 'reset_ai_usage',
      target_type: 'user',
      target_id: user_id,
      metadata: {
        workspace_id,
        day: today,
        previous_total: previousTotal,
        records_reset: resetCount,
      },
    });

    console.log('[ai-reset-today] Reset by:', user.id, 'Target:', user_id, 'Workspace:', workspace_id, 'Previous:', previousTotal);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Consumo de IA zerado para hoje`,
        previous_usage: previousTotal,
        records_reset: resetCount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ai-reset-today] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
