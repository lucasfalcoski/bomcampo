import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TransactionCreateRequest {
  farm_id: string;
  plot_id?: string;
  tipo: 'receita' | 'custo';
  categoria: 'insumo' | 'mao_obra' | 'maquinas' | 'energia' | 'transporte' | 'venda' | 'outros' | 'adubacao';
  descricao: string;
  valor_brl: number;
  data?: string;
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

    const body: TransactionCreateRequest = await req.json();
    const { farm_id, plot_id, tipo, categoria, descricao, valor_brl, data } = body;

    // Validate required fields
    if (!farm_id) {
      return new Response(
        JSON.stringify({ error: "farm_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tipo || !['receita', 'custo'].includes(tipo)) {
      return new Response(
        JSON.stringify({ error: "tipo inválido (receita ou custo)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!categoria) {
      return new Response(
        JSON.stringify({ error: "categoria é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!descricao?.trim()) {
      return new Response(
        JSON.stringify({ error: "descrição é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (typeof valor_brl !== 'number' || valor_brl <= 0) {
      return new Response(
        JSON.stringify({ error: "valor deve ser um número positivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the farm
    const { data: farm } = await supabase
      .from('farms')
      .select('id, user_id')
      .eq('id', farm_id)
      .single();

    if (!farm || farm.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Acesso negado à fazenda" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create transaction
    const today = new Date().toISOString().split('T')[0];
    const { data: transaction, error: insertError } = await supabase
      .from('transactions')
      .insert({
        farm_id,
        plot_id: plot_id || null,
        tipo,
        categoria,
        descricao: descricao.trim(),
        valor_brl,
        data: data || today,
        origem: 'ai_copilot',
      })
      .select('id, tipo, categoria, valor_brl, data')
      .single();

    if (insertError) {
      console.error('[transactions-create] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar transação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[transactions-create] Transaction created:', transaction.id);

    return new Response(
      JSON.stringify({
        success: true,
        id: transaction.id,
        transaction,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[transactions-create] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
  }
});
