import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActivityCreateRequest {
  plot_id: string;
  tipo: string;
  data?: string;
  descricao?: string;
  responsavel?: string;
  observacoes?: string;
  custo_estimado?: number;
  planting_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ActivityCreateRequest = await req.json();
    console.log('[activities-create] Request:', { userId: user.id, body });

    // Validate required fields
    if (!body.plot_id) {
      return new Response(
        JSON.stringify({ error: "plot_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.tipo) {
      return new Response(
        JSON.stringify({ error: "tipo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has access to the plot (via farm ownership or workspace membership)
    const { data: plot, error: plotError } = await supabase
      .from('plots')
      .select('id, nome, farm_id, farms!inner(id, nome, user_id, workspace_id)')
      .eq('id', body.plot_id)
      .single();

    if (plotError || !plot) {
      console.error('[activities-create] Plot not found:', plotError);
      return new Response(
        JSON.stringify({ error: "Talhão não encontrado ou acesso negado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepare activity data
    const activityData = {
      plot_id: body.plot_id,
      tipo: body.tipo,
      data: body.data || new Date().toISOString().split('T')[0],
      descricao: body.descricao || null,
      responsavel: body.responsavel || user.email,
      observacoes: body.observacoes || null,
      custo_estimado: body.custo_estimado || null,
      planting_id: body.planting_id || null,
      realizado: true, // Created activities are considered done
    };

    // Insert activity
    const { data: activity, error: insertError } = await supabase
      .from('activities')
      .insert(activityData)
      .select('id, plot_id, tipo, data, descricao, responsavel')
      .single();

    if (insertError) {
      console.error('[activities-create] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar atividade", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[activities-create] Activity created:', activity.id);

    return new Response(
      JSON.stringify({
        success: true,
        activity_id: activity.id,
        activity: {
          ...activity,
          plot_nome: plot.nome,
          farm_nome: (plot.farms as any).nome,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[activities-create] Error:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
