import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TaskCreateRequest {
  workspace_id: string;
  farm_id?: string;
  talhao_id?: string;
  title: string;
  notes?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TaskCreateRequest = await req.json();
    const { workspace_id, farm_id, talhao_id, title, notes, due_date, priority, assigned_to } = body;

    // Validate required fields
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!title?.trim()) {
      return new Response(
        JSON.stringify({ error: "título é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is member of workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "Acesso negado ao workspace" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create task
    const { data: task, error: insertError } = await supabase
      .from('tasks')
      .insert({
        workspace_id,
        farm_id: farm_id || null,
        talhao_id: talhao_id || null,
        title: title.trim(),
        notes: notes || null,
        due_date: due_date || null,
        priority: priority || 'medium',
        status: 'open',
        created_by: user.id,
        assigned_to: assigned_to || null,
      })
      .select('id, title, status, due_date, priority')
      .single();

    if (insertError) {
      console.error('[tasks-create] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar tarefa" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[tasks-create] Task created:', task.id);

    return new Response(
      JSON.stringify({
        success: true,
        id: task.id,
        task,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[tasks-create] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
