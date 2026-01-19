import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTodayBRT } from "../_shared/date.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetRequest {
  user_id: string;
  workspace_id: string;
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

    // First, get count of records to delete (for audit)
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

    const previousTotal = (existingRecords || []).reduce((sum, r) => sum + (r.requests || 0), 0);
    const recordCount = existingRecords?.length || 0;

    // DELETE all records for today (regardless of source) to avoid mismatch
    const { error: deleteError, count: deletedCount } = await supabase
      .from('ai_usage_log')
      .delete({ count: 'exact' })
      .eq('workspace_id', workspace_id)
      .eq('user_id', user_id)
      .eq('day', today);

    if (deleteError) {
      console.error('[ai-reset-today] Delete error:', deleteError);
      return new Response(JSON.stringify({ error: "Failed to reset usage" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
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
        deleted_count: deletedCount ?? recordCount,
      },
    });

    console.log('[ai-reset-today] Reset by:', user.id, 'Target:', user_id, 'Workspace:', workspace_id, 'Deleted:', deletedCount ?? recordCount);

    return new Response(
      JSON.stringify({
        ok: true,
        success: true,
        message: `Consumo de IA zerado para hoje`,
        previous_usage: previousTotal,
        deleted_count: deletedCount ?? recordCount,
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
