import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OccurrenceCreateRequest {
  workspace_id: string;
  farm_id?: string;
  talhao_id?: string;
  category: 'praga' | 'doenca' | 'deficiencia' | 'dano_climatico' | 'erva_daninha' | 'outro';
  description?: string;
  severity?: 'baixa' | 'media' | 'alta' | 'critica';
  photo_url?: string;
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

    const body: OccurrenceCreateRequest = await req.json();
    const { workspace_id, farm_id, talhao_id, category, description, severity, photo_url } = body;

    // Validate required fields
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: "workspace_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!category) {
      return new Response(
        JSON.stringify({ error: "categoria é obrigatória" }),
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

    // Create occurrence
    const { data: occurrence, error: insertError } = await supabase
      .from('field_occurrences')
      .insert({
        workspace_id,
        farm_id: farm_id || null,
        talhao_id: talhao_id || null,
        category,
        description: description || null,
        severity: severity || 'media',
        photo_url: photo_url || null,
        status: 'open',
        created_by: user.id,
      })
      .select('id, category, severity, status')
      .single();

    if (insertError) {
      console.error('[occurrences-create] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar ocorrência" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[occurrences-create] Occurrence created:', occurrence.id);

    return new Response(
      JSON.stringify({
        success: true,
        id: occurrence.id,
        occurrence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[occurrences-create] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
