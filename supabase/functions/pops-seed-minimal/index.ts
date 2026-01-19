import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== 10 POPs MÍNIMOS (sem prescrição de doses/produtos) ==========
const MINIMAL_POPS = [
  {
    slug: "checklist-pre-aplicacao-condicoes",
    title: "Checklist pré-aplicação — condições e segurança",
    category: "Aplicação",
    summary: "Passos para checar condições antes de qualquer aplicação, sem prescrever produto/dose.",
    keywords: ["aplicação", "pulverização", "checklist", "segurança", "clima"],
    steps: [
      { order: 1, title: "Verifique previsão", text: "Confira chuva nas próximas horas e risco de mudança brusca de tempo." },
      { order: 2, title: "Checar vento e rajadas", text: "Evite operar com vento forte/irregular (risco de deriva)." },
      { order: 3, title: "Checar umidade/temperatura", text: "Condições extremas aumentam risco de evaporação/deriva." },
      { order: 4, title: "Orvalho/inversão", text: "Evite condições com orvalho intenso ou inversão térmica." },
      { order: 5, title: "Equipamento", text: "Inspecione vazamentos, filtros, bicos, pressão e calibração." },
      { order: 6, title: "EPI", text: "Garanta EPI completo e em boas condições." },
      { order: 7, title: "Registro", text: "Registre atividade (talhão, data/hora, objetivo, observações)." },
      { order: 8, title: "Escalonar", text: "Em caso de dúvida técnica, acione o agrônomo responsável." },
    ],
  },
  {
    slug: "checklist-inspecao-pragas",
    title: "Checklist de inspeção — pragas",
    category: "Monitoramento",
    summary: "Como inspecionar e registrar sinais de pragas com segurança.",
    keywords: ["praga", "inspeção", "monitoramento", "ocorrência"],
    steps: [
      { order: 1, title: "Roteiro", text: "Caminhe em zigue-zague e observe pontos altos/baixos e bordas." },
      { order: 2, title: "Folhas", text: "Avalie folhas novas e velhas; observe verso e nervuras." },
      { order: 3, title: "Sinais", text: "Procure perfurações, raspagens, teias, melada, ovos, larvas." },
      { order: 4, title: "Amostra", text: "Fotografe e anote local exato (talhão/linha/ponto)." },
      { order: 5, title: "Severidade", text: "Registre área afetada aproximada (baixa/média/alta)." },
      { order: 6, title: "Ocorrência", text: "Abra uma ocorrência no sistema com fotos e descrição." },
      { order: 7, title: "Agrônomo", text: "Se persistir ou houver dúvida, envie ao agrônomo." },
    ],
  },
  {
    slug: "checklist-inspecao-doencas",
    title: "Checklist de inspeção — doenças",
    category: "Monitoramento",
    summary: "Como coletar sinais e informações antes de qualquer decisão técnica.",
    keywords: ["doença", "inspeção", "monitoramento", "ferrugem", "fungo"],
    steps: [
      { order: 1, title: "Padrão", text: "Observe se o problema está em manchas, faixas, reboleiras ou bordas." },
      { order: 2, title: "Sintomas", text: "Registre manchas, necrose, pó, mofo, deformações, queda de folhas/frutos." },
      { order: 3, title: "Condições", text: "Anote chuva recente, umidade alta, sombra, ventilação do talhão." },
      { order: 4, title: "Fotos", text: "Tire fotos de perto e de longe (contexto do talhão)." },
      { order: 5, title: "Ocorrência", text: "Registre no sistema com data e localização." },
      { order: 6, title: "Escalonar", text: "Solicite avaliação do agrônomo quando houver dúvida." },
    ],
  },
  {
    slug: "checklist-irrigacao-verificacao",
    title: "Checklist de irrigação — verificação do sistema",
    category: "Irrigação",
    summary: "Checagem rápida de funcionamento sem definir lâmina/tempo.",
    keywords: ["irrigação", "gotejo", "bomba", "manutenção"],
    steps: [
      { order: 1, title: "Bomba/painel", text: "Verifique energia, ruídos anormais e alarmes." },
      { order: 2, title: "Pressão/vazão", text: "Compare com padrão da sua área." },
      { order: 3, title: "Filtros", text: "Verifique e limpe conforme necessidade." },
      { order: 4, title: "Linhas", text: "Procure vazamentos, entupimentos e gotejadores falhando." },
      { order: 5, title: "Uniformidade", text: "Observe áreas secas/molhadas fora do padrão." },
      { order: 6, title: "Registro", text: "Registre manutenção/ajustes realizados." },
      { order: 7, title: "Tarefa", text: "Se houver falha recorrente, crie tarefa de manutenção preventiva." },
    ],
  },
  {
    slug: "checklist-manutencao-pulverizador",
    title: "Checklist manutenção — pulverizador (antes e depois)",
    category: "Equipamentos",
    summary: "Evita falhas e melhora segurança operacional.",
    keywords: ["pulverizador", "manutenção", "equipamento", "bico"],
    steps: [
      { order: 1, title: "Inspeção visual", text: "Mangueiras, conexões, abraçadeiras e vazamentos." },
      { order: 2, title: "Filtros", text: "Limpeza/checagem." },
      { order: 3, title: "Bicos", text: "Verificar desgaste e entupimento." },
      { order: 4, title: "Calibração", text: "Confirmar que o equipamento está consistente com seu padrão." },
      { order: 5, title: "Lavagem", text: "Limpeza pós-uso conforme boas práticas." },
      { order: 6, title: "Armazenagem", text: "Guardar em local seco e seguro." },
      { order: 7, title: "Registro", text: "Registrar manutenção e observações no sistema." },
    ],
  },
  {
    slug: "checklist-manutencao-irrigacao",
    title: "Checklist manutenção — irrigação (rotina)",
    category: "Irrigação",
    summary: "Rotina preventiva para reduzir paradas.",
    keywords: ["irrigação", "manutenção", "preventiva", "bomba"],
    steps: [
      { order: 1, title: "Filtros", text: "Limpar conforme rotina." },
      { order: 2, title: "Válvulas", text: "Conferir abertura/fechamento e vazamentos." },
      { order: 3, title: "Linhas", text: "Checar vazamentos e entupimentos recorrentes." },
      { order: 4, title: "Bomba", text: "Ver ruído, aquecimento e vibração." },
      { order: 5, title: "Registro", text: "Anotar pontos problemáticos e ações tomadas." },
      { order: 6, title: "Tarefa", text: "Criar tarefa preventiva semanal/mensal." },
    ],
  },
  {
    slug: "checklist-pre-colheita-cafe",
    title: "Checklist pré-colheita — café",
    category: "Colheita",
    summary: "Preparação operacional e registros.",
    keywords: ["colheita", "café", "terreiro", "preparação"],
    steps: [
      { order: 1, title: "Equipe", text: "Planejar escala e orientações de segurança." },
      { order: 2, title: "Terreiro/estrutura", text: "Conferir limpeza e espaço." },
      { order: 3, title: "Materiais", text: "Sacarias, lonas, ferramentas e local de armazenamento." },
      { order: 4, title: "Clima", text: "Verificar previsão e planejar janelas operacionais." },
      { order: 5, title: "Registro", text: "Registrar início previsto e talhões priorizados." },
    ],
  },
  {
    slug: "checklist-pos-chuva",
    title: "Checklist pós-chuva — riscos e ações",
    category: "Clima",
    summary: "Passos após eventos de chuva para reduzir risco.",
    keywords: ["chuva", "clima", "erosão", "doença", "pós-chuva"],
    steps: [
      { order: 1, title: "Acesso", text: "Verificar atoleiros e áreas encharcadas antes de entrar com máquina." },
      { order: 2, title: "Erosão", text: "Identificar sulcos e pontos de escoamento." },
      { order: 3, title: "Doenças", text: "Monitorar sinais em áreas mais úmidas/sombreadas." },
      { order: 4, title: "Irrigação", text: "Reavaliar necessidade operacional." },
      { order: 5, title: "Registro", text: "Abrir ocorrência se houver dano e registrar fotos." },
    ],
  },
  {
    slug: "checklist-seguranca-epi",
    title: "Checklist de segurança — EPI e operação",
    category: "Segurança",
    summary: "Rotina básica para reduzir acidentes.",
    keywords: ["segurança", "epi", "acidente", "treinamento"],
    steps: [
      { order: 1, title: "EPI", text: "Conferir itens obrigatórios para a atividade do dia." },
      { order: 2, title: "Condição", text: "Verificar desgaste, rasgos, filtros e validade quando aplicável." },
      { order: 3, title: "Treinamento", text: "Reforçar regras de uso e higienização." },
      { order: 4, title: "Registro", text: "Registrar incidentes/quase-acidentes como ocorrência." },
    ],
  },
  {
    slug: "checklist-registro-atividades",
    title: "Padrão de registro — atividades no talhão",
    category: "Gestão",
    summary: "O que registrar para manter histórico útil.",
    keywords: ["registro", "atividade", "gestão", "histórico"],
    steps: [
      { order: 1, title: "Talhão", text: "Sempre indicar talhão (ou área) e data/hora." },
      { order: 2, title: "Tipo", text: "Selecionar tipo (limpeza/roçada/irrigação/manutenção/inspeção)." },
      { order: 3, title: "Descrição", text: "Descrever de forma simples o que foi feito." },
      { order: 4, title: "Evidência", text: "Anexar foto se útil." },
      { order: 5, title: "Resultado", text: "Registrar observações e próximos passos/tarefas." },
    ],
  },
];

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

    // Validate user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is superadmin
    const { data: sysRole } = await supabase
      .from("user_system_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!sysRole) {
      return new Response(
        JSON.stringify({ error: "Apenas superadmin pode executar esta ação" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const pop of MINIMAL_POPS) {
      // UPSERT POP (workspace_id NULL = global)
      const { data: existingPop } = await supabase
        .from("pops")
        .select("id")
        .is("workspace_id", null)
        .eq("slug", pop.slug)
        .maybeSingle();

      let popId: string;

      if (existingPop) {
        // Update existing
        await supabase
          .from("pops")
          .update({
            title: pop.title,
            category: pop.category,
            summary: pop.summary,
            keywords: pop.keywords,
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingPop.id);
        
        popId = existingPop.id;
        updated++;
      } else {
        // Insert new
        const { data: newPop, error: insertError } = await supabase
          .from("pops")
          .insert({
            workspace_id: null,
            slug: pop.slug,
            title: pop.title,
            category: pop.category,
            summary: pop.summary,
            keywords: pop.keywords,
            is_active: true,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Error inserting POP:", insertError);
          continue;
        }
        
        popId = newPop.id;
        inserted++;
      }

      // Delete existing steps and re-insert (simpler than upsert with order)
      await supabase
        .from("pop_steps")
        .delete()
        .eq("pop_id", popId);

      // Insert steps
      const stepsToInsert = pop.steps.map((s) => ({
        pop_id: popId,
        step_order: s.order,
        step_title: s.title,
        step_text: s.text,
      }));

      await supabase.from("pop_steps").insert(stepsToInsert);
    }

    // Log action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: "seed_minimal_pops",
      target_type: "pops",
      metadata: { inserted, updated, total: MINIMAL_POPS.length },
    });

    console.log(`POPs seed completed: ${inserted} inserted, ${updated} updated`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        inserted, 
        updated, 
        total: MINIMAL_POPS.length,
        message: `POPs atualizados: ${inserted} novos, ${updated} atualizados` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in pops-seed-minimal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
