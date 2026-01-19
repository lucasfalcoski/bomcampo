import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Guardrails: Patterns that require professional prescription
const BLOCKED_PATTERNS = [
  // Doses and application
  /dose\s*(de|do|da|para|por|recomendada)?/i,
  /quanto\s+(aplicar|usar|colocar)/i,
  /quantos?\s+(litros?|ml|gramas?|kg)/i,
  /dosagem/i,
  /taxa\s+de\s+aplica[çc][ãa]o/i,
  
  // Tank mix
  /mistura\s+(de\s+)?tanque/i,
  /misturar?\s+(com|produto)/i,
  /combina[çc][ãa]o\s+de\s+(produtos?|defensivos?)/i,
  /calda/i,
  /adjuvante/i,
  
  // Safety interval
  /car[êe]ncia/i,
  /intervalo\s+de\s+seguran[çc]a/i,
  /per[ií]odo\s+de\s+car[êe]ncia/i,
  /dias?\s+(antes|ap[óo]s)\s+(colheita|aplicar)/i,
  
  // Immediate application
  /aplicar\s+hoje/i,
  /posso\s+aplicar\s+agora/i,
  /devo\s+pulverizar\s+hoje/i,
  
  // Specific brands/products
  /receita\s+(de|para)/i,
  /qual\s+(produto|defensivo|fungicida|inseticida|herbicida)\s+(usar|aplicar|comprar)/i,
  /melhor\s+(produto|defensivo|marca)/i,
  /nome\s+comercial/i,
  /registro\s+no\s+mapa/i,
];

// Intent classification patterns
const INTENT_PATTERNS = {
  operational: [
    /relat[óo]rio/i,
    /exportar/i,
    /cadastr(ar|o)/i,
    /como\s+(usar|acessar|configurar|criar)/i,
    /onde\s+(fica|encontro|est[áa])/i,
    /funcionalidade/i,
    /sistema/i,
    /tela/i,
    /bot[ãa]o/i,
  ],
  zoning: [
    /zoneamento/i,
    /janela\s+de\s+(plantio|semeadura)/i,
    /[ée]poca\s+de\s+(plantio|semeadura)/i,
    /cultivar\s+(recomendad[ao]|indicad[ao])/i,
    /regi[ãa]o\s+(produtora|indicada)/i,
    /zarc/i,
  ],
  ndvi: [
    /ndvi/i,
    /evi/i,
    /[íi]ndice\s+de\s+vegeta[çc][ãa]o/i,
    /sat[ée]lite/i,
    /imagem\s+de\s+sat[ée]lite/i,
    /vigor\s+vegetativo/i,
  ],
  agronomic: [
    /praga/i,
    /doen[çc]a/i,
    /defici[êe]ncia/i,
    /nutri[çc][ãa]o/i,
    /solo/i,
    /irrigar/i,
    /irriga[çc][ãa]o/i,
    /fertiliza[çc][ãa]o/i,
    /aduba[çc][ãa]o/i,
    /manejo/i,
    /fenologia/i,
    /est[áa]dio/i,
    /sintoma/i,
    /identific(ar|a[çc][ãa]o)/i,
  ],
};

interface AIRequest {
  workspace_id?: string;
  farm_id?: string;
  user_message: string;
  photo_url?: string;
  conversation_id?: string;
}

interface AIAction {
  type: 'open_report' | 'open_pop' | 'create_task' | 'escalate_agronomist' | 'view_content';
  id?: string;
  payload?: Record<string, unknown>;
  label?: string;
}

interface AIResponse {
  assistant_text: string;
  actions: AIAction[];
  flags: {
    show_escalate_to_agronomist?: boolean;
    blocked_reason?: string;
    decision_route?: string;
    sources_used?: string[];
  };
}

function checkBlockedContent(message: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      const match = message.match(pattern);
      return match?.[0] || 'conteúdo restrito';
    }
  }
  return null;
}

function classifyIntent(message: string): 'operational' | 'zoning' | 'ndvi' | 'agronomic' | 'general' {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return intent as 'operational' | 'zoning' | 'ndvi' | 'agronomic';
      }
    }
  }
  return 'general';
}

// deno-lint-ignore no-explicit-any
async function getWorkspacePlan(supabase: any, workspaceId: string): Promise<string> {
  const { data } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single();
  return data?.plan || 'free';
}

// deno-lint-ignore no-explicit-any
async function getEffectiveFlags(supabase: any, workspaceId: string | null): Promise<Record<string, unknown>> {
  const flags: Record<string, unknown> = {
    ai_enabled: true,
    ai_daily_quota: 10,
    respondeagro_enabled: true,
    agritec_enabled: false,
    satveg_enabled: false,
  };

  // Get global flags
  const { data: globalFlags } = await supabase
    .from('feature_flags_global')
    .select('key, value_json');

  if (globalFlags) {
    for (const flag of globalFlags) {
      const val = flag.value_json as Record<string, unknown>;
      flags[flag.key] = val?.enabled ?? val?.value ?? false;
    }
  }

  if (workspaceId) {
    // Get workspace plan
    const plan = await getWorkspacePlan(supabase, workspaceId);
    flags.plan = plan;
    flags.ai_daily_quota = plan === 'enterprise' ? 500 : plan === 'premium' ? 150 : 10;

    // Get workspace-specific flags
    const { data: wsFlags } = await supabase
      .from('feature_flags_workspace')
      .select('key, value_json')
      .eq('workspace_id', workspaceId);

    if (wsFlags) {
      for (const flag of wsFlags) {
        const val = flag.value_json as Record<string, unknown>;
        flags[flag.key] = val?.enabled ?? val?.value ?? false;
      }
    }
  }

  return flags;
}

// deno-lint-ignore no-explicit-any
async function getTodayUsage(supabase: any, workspaceId: string, userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('ai_usage_log')
    .select('requests')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today);

  if (!data) return 0;
  return data.reduce((sum: number, row: { requests: number }) => sum + (row.requests || 0), 0);
}

// deno-lint-ignore no-explicit-any
async function incrementUsage(
  supabase: any,
  workspaceId: string,
  userId: string,
  source: string,
  tokensIn: number = 0,
  tokensOut: number = 0
): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  // Try to update existing record first
  const { data: existing } = await supabase
    .from('ai_usage_log')
    .select('id, requests, tokens_in, tokens_out')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today)
    .eq('source', source)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('ai_usage_log')
      .update({
        requests: (existing.requests || 0) + 1,
        tokens_in: (existing.tokens_in || 0) + tokensIn,
        tokens_out: (existing.tokens_out || 0) + tokensOut,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('ai_usage_log')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        day: today,
        source,
        requests: 1,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
      });
  }
}

// deno-lint-ignore no-explicit-any
async function saveConversation(
  supabase: any,
  userId: string,
  workspaceId: string | null,
  conversationId: string | null,
  userMessage: string,
  assistantMessage: string,
  metaJson: Record<string, unknown>
): Promise<string> {
  let convId = conversationId;

  // Create conversation if needed
  if (!convId) {
    const { data: conv, error: convError } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        workspace_id: workspaceId,
      })
      .select('id')
      .single();

    if (convError) {
      console.error('[ai-ask] Error creating conversation:', convError);
      throw new Error('Failed to create conversation');
    }
    convId = conv.id;
  }

  // Save user message
  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: userMessage,
  });

  // Save assistant message
  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content: assistantMessage,
    meta_json: metaJson,
  });

  return convId!;
}

async function callLovableAI(
  systemPrompt: string,
  userMessage: string,
  photoUrl?: string
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY not configured");
  }

  const messages: Array<{ role: string; content: unknown }> = [
    { role: "system", content: systemPrompt },
  ];

  // Add user message with optional image
  if (photoUrl) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userMessage },
        { type: "image_url", image_url: { url: photoUrl } },
      ],
    });
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ai-ask] AI gateway error:', response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("rate_limited");
    }
    if (response.status === 402) {
      throw new Error("payment_required");
    }
    throw new Error("AI gateway error");
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;

  return { text, tokensIn, tokensOut };
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: AIRequest = await req.json();
    const { workspace_id, farm_id, user_message, photo_url, conversation_id } = body;

    if (!user_message?.trim()) {
      return new Response(
        JSON.stringify({ error: "Mensagem não pode estar vazia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('[ai-ask] Request:', { 
      userId: user.id, 
      workspaceId: workspace_id, 
      farmId: farm_id,
      hasPhoto: !!photo_url,
      messageLength: user_message.length 
    });

    // 1. Check for blocked content (guardrails)
    const blockedReason = checkBlockedContent(user_message);
    if (blockedReason) {
      console.log('[ai-ask] Blocked content detected:', blockedReason);
      
      const response: AIResponse = {
        assistant_text: `⚠️ **Não posso fornecer prescrição ou recomendação técnica específica sobre "${blockedReason}".**\n\nPor razões de segurança e regulatórias, informações sobre doses, misturas de tanque, períodos de carência ou recomendações de produtos específicos devem ser fornecidas por um agrônomo responsável técnico.\n\n**O que você pode fazer:**\n- Consultar o agrônomo responsável pela sua fazenda\n- Verificar a bula/receituário do produto\n- Consultar o MAPA para informações oficiais`,
        actions: [
          {
            type: 'escalate_agronomist',
            label: 'Enviar ao Agrônomo',
          },
        ],
        flags: {
          show_escalate_to_agronomist: true,
          blocked_reason: blockedReason,
          decision_route: 'blocked_guardrail',
        },
      };

      // Save conversation even for blocked content
      if (workspace_id) {
        await saveConversation(
          supabase,
          user.id,
          workspace_id,
          conversation_id || null,
          user_message,
          response.assistant_text,
          response.flags
        );
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check quotas
    if (workspace_id) {
      const flags = await getEffectiveFlags(supabase, workspace_id);
      
      if (!flags.ai_enabled) {
        return new Response(
          JSON.stringify({
            assistant_text: "O assistente de IA não está habilitado para sua conta. Entre em contato com o administrador.",
            actions: [],
            flags: { decision_route: 'disabled' },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const usage = await getTodayUsage(supabase, workspace_id, user.id);
      const limit = flags.ai_daily_quota as number;

      if (usage >= limit) {
        const response: AIResponse = {
          assistant_text: `📊 **Você atingiu o limite diário de ${limit} consultas ao assistente.**\n\nSeu limite será renovado amanhã. Para aumentar seu limite, considere fazer upgrade do seu plano.\n\n**Enquanto isso, você pode:**\n- Consultar nossos conteúdos técnicos\n- Enviar sua dúvida para um agrônomo`,
          actions: [
            { type: 'view_content', label: 'Ver Conteúdos' },
            { type: 'escalate_agronomist', label: 'Falar com Agrônomo' },
          ],
          flags: {
            show_escalate_to_agronomist: true,
            decision_route: 'quota_exceeded',
          },
        };

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Classify intent and route
    const intent = classifyIntent(user_message);
    const flags = workspace_id ? await getEffectiveFlags(supabase, workspace_id) : {};
    const isPremiumPlan = flags.plan === 'premium' || flags.plan === 'enterprise';
    
    let decisionRoute = 'llm_general';
    const sourcesUsed: string[] = [];
    let systemPrompt = '';
    let finalResponse: AIResponse;

    console.log('[ai-ask] Intent:', intent, 'Premium:', isPremiumPlan);

    // 4. Route based on intent
    if (intent === 'operational') {
      decisionRoute = 'operational_internal';
      systemPrompt = `Você é o assistente do BomCampo, uma plataforma de gestão agrícola.
      
Responda perguntas sobre:
- Como usar a plataforma (cadastros, relatórios, talhões, atividades)
- Onde encontrar funcionalidades
- Como configurar preferências

Seja direto e prático. Use emojis para deixar a resposta mais amigável.
Sempre que possível, indique onde na plataforma o usuário pode encontrar o que precisa.

Se a pergunta não for sobre o sistema, responda educadamente que você pode ajudar com dúvidas sobre a plataforma.`;

    } else if (intent === 'zoning' && flags.agritec_enabled && isPremiumPlan) {
      decisionRoute = 'agritec';
      sourcesUsed.push('agritec');
      // In production, call Agritec API here
      systemPrompt = `Você é um especialista em zoneamento agrícola.
      
Forneça informações sobre:
- Janelas de plantio recomendadas
- Cultivares indicadas para a região
- Riscos climáticos

Seja técnico mas acessível. Cite fontes quando possível (ex: ZARC/MAPA).

IMPORTANTE: Nunca recomende doses ou produtos específicos.`;

    } else if (intent === 'ndvi' && flags.satveg_enabled && isPremiumPlan) {
      decisionRoute = 'satveg';
      sourcesUsed.push('satveg');
      // In production, call SATVeg API here
      systemPrompt = `Você é um especialista em sensoriamento remoto agrícola.
      
Ajude com:
- Interpretação de índices de vegetação (NDVI, EVI)
- Análise de vigor vegetativo
- Identificação de variabilidade espacial

Explique de forma prática como usar essas informações no manejo.`;

    } else if ((intent === 'agronomic' || intent === 'general') && flags.respondeagro_enabled) {
      decisionRoute = 'respondeagro_llm';
      sourcesUsed.push('respondeagro');
      // In production, call RespondeAgro API here, then synthesize with LLM
      systemPrompt = `Você é um assistente agronômico do BomCampo.
      
Sua missão é ajudar produtores com dúvidas sobre:
- Identificação de pragas e doenças (apenas descrição, NÃO prescreva tratamento)
- Deficiências nutricionais (apenas identificação)
- Boas práticas de manejo
- Fenologia e estádios de desenvolvimento

REGRAS ESTRITAS:
1. NUNCA recomende doses, produtos ou misturas específicas
2. NUNCA diga "aplicar X litros/ha" ou similar
3. NUNCA recomende marcas comerciais
4. Para tratamentos, sempre oriente: "consulte o agrônomo responsável técnico"

Se uma foto foi enviada, descreva o que você observa e possíveis causas, mas NÃO prescreva tratamento.

Seja técnico mas acessível. Use emojis para facilitar a leitura.`;

    } else {
      // General fallback
      systemPrompt = `Você é um assistente do BomCampo, uma plataforma de gestão agrícola.
      
Ajude o usuário com sua dúvida de forma educada e prestativa.

REGRAS:
1. NUNCA recomende doses, produtos ou misturas específicas
2. Para questões técnicas complexas, sugira consultar um agrônomo
3. Seja amigável e use emojis

Se a pergunta for muito específica sobre prescrição técnica, explique que você não pode fornecer essa informação e ofereça alternativas.`;
    }

    // 5. Call LLM
    try {
      const { text, tokensIn, tokensOut } = await callLovableAI(
        systemPrompt,
        user_message,
        photo_url
      );

      sourcesUsed.push('lovable_ai');

      // Build actions based on response
      const actions: AIAction[] = [];
      
      // Add escalate option for agronomic questions
      if (intent === 'agronomic' || photo_url) {
        actions.push({
          type: 'escalate_agronomist',
          label: 'Falar com Agrônomo',
        });
      }

      // Add report action for operational questions
      if (intent === 'operational' && /relat[óo]rio/i.test(user_message)) {
        actions.push({
          type: 'open_report',
          id: 'reports',
          label: 'Ver Relatórios',
        });
      }

      finalResponse = {
        assistant_text: text,
        actions,
        flags: {
          show_escalate_to_agronomist: intent === 'agronomic' || !!photo_url,
          decision_route: decisionRoute,
          sources_used: sourcesUsed,
        },
      };

      // 6. Record usage
      if (workspace_id) {
        await incrementUsage(supabase, workspace_id, user.id, 'lovable_ai', tokensIn, tokensOut);
      }

      // 7. Save conversation
      if (workspace_id) {
        await saveConversation(
          supabase,
          user.id,
          workspace_id,
          conversation_id || null,
          user_message,
          text,
          finalResponse.flags
        );
      }

    } catch (aiError) {
      console.error('[ai-ask] AI error:', aiError);
      
      if ((aiError as Error).message === 'rate_limited') {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if ((aiError as Error).message === 'payment_required') {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      finalResponse = {
        assistant_text: "Desculpe, estou com dificuldades técnicas no momento. Por favor, tente novamente mais tarde ou envie sua dúvida para um agrônomo.",
        actions: [
          { type: 'escalate_agronomist', label: 'Falar com Agrônomo' },
        ],
        flags: {
          show_escalate_to_agronomist: true,
          decision_route: 'error_fallback',
        },
      };
    }

    console.log('[ai-ask] Response sent:', { 
      route: finalResponse.flags.decision_route,
      sources: finalResponse.flags.sources_used,
      actionsCount: finalResponse.actions.length 
    });

    return new Response(
      JSON.stringify(finalResponse),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[ai-ask] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
