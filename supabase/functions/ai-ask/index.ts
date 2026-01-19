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
  register_activity: [
    /registr(ar|ei|ou|amos)\s*(uma?\s*)?(atividade|trabalho|servi[çc]o)/i,
    /fiz(emos)?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina|aplica[çc][ãa]o)/i,
    /realizei?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o)/i,
    /trabalho\s+(feito|realizado|executado)/i,
    /servi[çc]o\s+(realizado|feito|conclu[ií]do)/i,
    /anotar\s+(atividade|trabalho)/i,
    /lan[çc]ar\s+(atividade|trabalho)/i,
    /criar\s+(atividade|registro)/i,
    /nova\s+atividade/i,
  ],
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

// Activity types with display names
const ACTIVITY_TYPES = [
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'rocada', label: 'Roçada' },
  { value: 'adubacao', label: 'Adubação' },
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'colheita', label: 'Colheita' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'capina', label: 'Capina' },
  { value: 'irrigacao', label: 'Irrigação' },
  { value: 'plantio', label: 'Plantio' },
  { value: 'preparo_solo', label: 'Preparo de Solo' },
  { value: 'outros', label: 'Outros' },
];

interface AIRequest {
  workspace_id?: string;
  farm_id?: string;
  plot_id?: string;
  user_message: string;
  photo_url?: string;
  conversation_id?: string;
  action_draft_id?: string;
}

interface AIAction {
  type: 'open_report' | 'open_pop' | 'create_task' | 'escalate_agronomist' | 'view_content' | 'start_action' | 'confirm_action' | 'edit_draft' | 'cancel_draft' | 'send_to_agronomist' | 'open_pricing';
  id?: string;
  payload?: Record<string, unknown>;
  label?: string;
  action_type?: string;
}

interface ActionFlow {
  mode: 'none' | 'collecting' | 'confirming' | 'awaiting_review';
  draft_id?: string;
  action_type?: string;
  next_question?: string;
  missing_fields?: string[];
  summary_preview?: string;
  ui_buttons?: string[];
}

interface SafetyInfo {
  blocked: boolean;
  reason?: string;
  suggest_escalate: boolean;
}

interface StructuredAIOutput {
  assistant_text: string;
  actions: Array<{ type: string; payload?: Record<string, unknown> }>;
  route: 'internal' | 'general_agro' | 'blocked' | 'quota_block' | 'fallback_text';
  safety: SafetyInfo;
}

interface ActionFlowField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  value?: unknown;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

interface ActionFlowData {
  type: string;
  title: string;
  fields: ActionFlowField[];
  confirm_label: string;
  cancel_label: string;
}

interface AIResponse {
  assistant_text: string;
  actions: AIAction[];
  action_flow?: ActionFlow;
  flags: {
    show_escalate_to_agronomist?: boolean;
    blocked_reason?: string;
    decision_route?: string;
    sources_used?: string[];
    ai_actions_enabled?: boolean;
    parse_mode?: ParseMode;
    action_flow_data?: ActionFlowData;
  };
  safety?: SafetyInfo;
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

function classifyIntent(message: string): 'register_activity' | 'operational' | 'zoning' | 'ndvi' | 'agronomic' | 'general' {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        return intent as 'register_activity' | 'operational' | 'zoning' | 'ndvi' | 'agronomic';
      }
    }
  }
  return 'general';
}

// Extract activity info from user message
function extractActivityInfo(message: string): { tipo?: string; descricao?: string; talhaoSearch?: string } {
  const result: { tipo?: string; descricao?: string; talhaoSearch?: string } = {};
  
  // Detect activity type
  const tipoPatterns = [
    { pattern: /limpeza/i, tipo: 'limpeza' },
    { pattern: /ro[çc]ada/i, tipo: 'rocada' },
    { pattern: /aduba[çc][ãa]o/i, tipo: 'adubacao' },
    { pattern: /pulveriza[çc][ãa]o/i, tipo: 'pulverizacao' },
    { pattern: /colheita/i, tipo: 'colheita' },
    { pattern: /manuten[çc][ãa]o/i, tipo: 'manutencao' },
    { pattern: /capina/i, tipo: 'capina' },
    { pattern: /irriga[çc][ãa]o/i, tipo: 'irrigacao' },
    { pattern: /plantio/i, tipo: 'plantio' },
    { pattern: /preparo\s+(de\s+)?solo/i, tipo: 'preparo_solo' },
  ];
  
  for (const { pattern, tipo } of tipoPatterns) {
    if (pattern.test(message)) {
      result.tipo = tipo;
      break;
    }
  }
  
  // Search for talhão reference
  const talhaoMatch = message.match(/talh[ãa]o\s+(\d+|[a-zA-Z]+)/i);
  if (talhaoMatch) {
    result.talhaoSearch = talhaoMatch[1];
  }
  
  // Build description from detected info
  if (result.tipo) {
    const tipoLabel = ACTIVITY_TYPES.find(t => t.value === result.tipo)?.label || result.tipo;
    result.descricao = `${tipoLabel} realizada`;
  }
  
  return result;
}

// Get plots for a farm
// deno-lint-ignore no-explicit-any
async function getFarmPlots(supabase: any, farmId: string): Promise<Array<{ id: string; nome: string }>> {
  const { data } = await supabase
    .from('plots')
    .select('id, nome')
    .eq('farm_id', farmId)
    .order('nome');
  
  return data || [];
}

// Find plot by name/number
function findPlotBySearch(plots: Array<{ id: string; nome: string }>, search: string): { id: string; nome: string } | null {
  const searchLower = search.toLowerCase();
  
  // Exact match
  const exact = plots.find(p => p.nome.toLowerCase() === searchLower);
  if (exact) return exact;
  
  // Contains match
  const contains = plots.find(p => p.nome.toLowerCase().includes(searchLower));
  if (contains) return contains;
  
  // Number match (e.g., "2" matches "Talhão 2")
  const numberMatch = plots.find(p => 
    p.nome.match(new RegExp(`\\b${search}\\b`, 'i'))
  );
  if (numberMatch) return numberMatch;
  
  return null;
}

// Helper to get current date in BRT (America/Sao_Paulo)
function getTodayBRT(): string {
  const now = new Date();
  const brtOffset = -3 * 60; // BRT is UTC-3
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
}

// Helper to safely parse numeric values from flags
function parseNumericFlag(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
    console.warn('[ai-ask] Could not parse numeric flag from string:', value, '- using fallback:', fallback);
    return fallback;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj) {
      const parsed = Number(obj.value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  console.warn('[ai-ask] Could not parse numeric flag:', value, '- using fallback:', fallback);
  return fallback;
}

// Helper to safely parse boolean values from flags
function parseBooleanFlag(value: unknown, fallback: boolean = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('enabled' in obj) return obj.enabled === true;
    if ('value' in obj) return obj.value === true;
  }
  return fallback;
}

// Check if user is a superadmin
// deno-lint-ignore no-explicit-any
async function isSuperadmin(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_system_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'superadmin')
    .maybeSingle();
  
  if (error) {
    console.error('[ai-ask] Error checking superadmin role:', error);
    return false;
  }
  return !!data;
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
    ai_admin_bypass: false,
    respondeagro_enabled: true,
    agritec_enabled: false,
    satveg_enabled: false,
    ai_actions_enabled: false,
    ai_actions_enabled_premium: true,
  };

  const { data: globalFlags } = await supabase
    .from('feature_flags_global')
    .select('key, value_json');

  if (globalFlags) {
    for (const flag of globalFlags) {
      const val = flag.value_json;
      // Handle numeric flags
      if (flag.key.includes('quota') || flag.key.includes('limit')) {
        flags[flag.key] = parseNumericFlag(val, flags[flag.key] as number || 10);
      } else {
        // Handle boolean/other flags
        flags[flag.key] = parseBooleanFlag(val, false);
      }
    }
  }

  if (workspaceId) {
    const plan = await getWorkspacePlan(supabase, workspaceId);
    flags.plan = plan;
    
    // Apply plan-based quota as default, can be overridden by flags
    const planQuota = plan === 'enterprise' ? 500 : plan === 'premium' ? 150 : 10;
    flags.ai_daily_quota = planQuota;
    
    if ((plan === 'premium' || plan === 'enterprise') && flags.ai_actions_enabled_premium) {
      flags.ai_actions_enabled = true;
    }

    const { data: wsFlags } = await supabase
      .from('feature_flags_workspace')
      .select('key, value_json')
      .eq('workspace_id', workspaceId);

    if (wsFlags) {
      for (const flag of wsFlags) {
        const val = flag.value_json;
        // Handle numeric flags
        if (flag.key.includes('quota') || flag.key.includes('limit')) {
          flags[flag.key] = parseNumericFlag(val, flags[flag.key] as number || 10);
        } else {
          // Handle boolean/other flags
          flags[flag.key] = parseBooleanFlag(val, false);
        }
      }
    }
  }

  return flags;
}

// deno-lint-ignore no-explicit-any
async function canPerformAction(
  supabase: any,
  workspaceId: string | null,
  userId: string,
  _actionType: string
): Promise<boolean> {
  const flags = await getEffectiveFlags(supabase, workspaceId);
  
  if (!flags.ai_actions_enabled) {
    return false;
  }

  if (workspaceId) {
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .maybeSingle();

    const allowedRoles = ['owner', 'manager', 'operator'];
    if (membership && !allowedRoles.includes(membership.role)) {
      return false;
    }
  }

  return true;
}

// deno-lint-ignore no-explicit-any
async function getTodayUsage(supabase: any, workspaceId: string, userId: string): Promise<number> {
  const today = getTodayBRT();
  console.log('[ai-ask] Checking usage for day (BRT):', today);
  
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
  const today = getTodayBRT();

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

  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: userMessage,
  });

  await supabase.from('ai_messages').insert({
    conversation_id: convId,
    role: 'assistant',
    content: assistantMessage,
    meta_json: metaJson,
  });

  return convId!;
}

// Tool definition for structured output
const structuredOutputTool = {
  type: "function" as const,
  function: {
    name: "respond_to_user",
    description: "Provide a structured response to the user's agricultural question",
    parameters: {
      type: "object",
      properties: {
        assistant_text: {
          type: "string",
          description: "The response text to show the user. Should be helpful, concise, and use emojis when appropriate."
        },
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["open_report", "create_task", "escalate_agronomist", "view_content", "start_action"],
                description: "Action type to suggest"
              },
              payload: {
                type: "object",
                description: "Optional payload for the action"
              }
            },
            required: ["type"],
            additionalProperties: false
          },
          description: "Suggested actions for the user"
        },
        action_flow: {
          type: "object",
          properties: {
            id: { type: "string", description: "Unique ID for the action flow" },
            title: { type: "string", description: "Title for the action dialog" },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  label: { type: "string" },
                  type: { type: "string", enum: ["text", "select", "date", "number"] },
                  value: {},
                  options: { type: "array" }
                },
                required: ["key", "label", "type"]
              }
            },
            confirm_label: { type: "string" },
            cancel_label: { type: "string" }
          },
          description: "Optional action flow for guided data collection"
        },
        route: {
          type: "string",
          enum: ["internal", "general_agro", "blocked", "quota_block", "fallback_text"],
          description: "The routing decision for this response"
        },
        safety: {
          type: "object",
          properties: {
            blocked: {
              type: "boolean",
              description: "Whether the response was blocked due to safety concerns"
            },
            reason: {
              type: "string",
              description: "Reason for blocking, if applicable"
            },
            suggest_escalate: {
              type: "boolean",
              description: "Whether to suggest escalating to a human agronomist"
            }
          },
          required: ["blocked"],
          additionalProperties: false
        }
      },
      required: ["assistant_text", "actions", "route", "safety"],
      additionalProperties: false
    }
  }
};

// Type for parse mode tracking
type ParseMode = "schema_ok" | "extracted_json" | "retry_ok" | "fallback_text";

// Helper to extract JSON from text
function extractJsonFromText(text: string): Record<string, unknown> | null {
  // Try to find JSON object in text
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      return null;
    }
  }
  return null;
}

// Validate and normalize parsed output
function normalizeOutput(parsed: Record<string, unknown>): StructuredAIOutput {
  const validRoutes = ['internal', 'general_agro', 'blocked', 'quota_block', 'fallback_text'] as const;
  const route = typeof parsed.route === 'string' && validRoutes.includes(parsed.route as typeof validRoutes[number]) 
    ? parsed.route as typeof validRoutes[number]
    : 'general_agro';
  
  const safetyData = parsed.safety as Record<string, unknown> | undefined;
  
  return {
    assistant_text: typeof parsed.assistant_text === 'string' ? parsed.assistant_text : String(parsed.assistant_text || ''),
    actions: Array.isArray(parsed.actions) ? parsed.actions.map((a: Record<string, unknown>) => ({
      type: String(a?.type || 'escalate_agronomist'),
      payload: a?.payload as Record<string, unknown> | undefined
    })) : [],
    route,
    safety: {
      blocked: Boolean(safetyData?.blocked),
      reason: safetyData?.reason as string | undefined,
      suggest_escalate: Boolean(safetyData?.suggest_escalate)
    }
  };
}

// Type for AI API response
interface AIAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        function?: {
          arguments?: string;
        };
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

// Make a single AI call
async function makeAICall(
  apiKey: string,
  messages: Array<{ role: string; content: unknown }>,
  useTools: boolean
): Promise<{ data: AIAPIResponse; tokensIn: number; tokensOut: number }> {
  const requestBody: Record<string, unknown> = {
    model: "openai/gpt-5-mini",
    messages,
    max_completion_tokens: 1024,
  };

  if (useTools) {
    requestBody.tools = [structuredOutputTool];
    requestBody.tool_choice = { type: "function", function: { name: "respond_to_user" } };
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[ai-ask] AI gateway error:', response.status, errorText);
    
    if (response.status === 429) throw new Error("rate_limited");
    if (response.status === 402) throw new Error("payment_required");
    throw new Error("AI gateway error");
  }

  const data: AIAPIResponse = await response.json();
  return {
    data,
    tokensIn: data.usage?.prompt_tokens || 0,
    tokensOut: data.usage?.completion_tokens || 0
  };
}

async function callLovableAI(
  systemPrompt: string,
  userMessage: string,
  photoUrl?: string,
  useStructuredOutput: boolean = true
): Promise<{ output: StructuredAIOutput; tokensIn: number; tokensOut: number; parseMode: ParseMode }> {
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

  console.log('[ai-ask] Calling Lovable AI with model: openai/gpt-5-mini');

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let parseMode: ParseMode = "schema_ok";

  // First attempt with tool calling
  const { data, tokensIn, tokensOut } = await makeAICall(LOVABLE_API_KEY, messages, useStructuredOutput);
  totalTokensIn += tokensIn;
  totalTokensOut += tokensOut;

  let output: StructuredAIOutput | null = null;

  if (useStructuredOutput) {
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    // Strategy 1: Parse tool call arguments directly
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments as string);
        output = normalizeOutput(parsed);
        parseMode = "schema_ok";
        console.log('[ai-ask] Parsed tool call successfully');
      } catch (parseError) {
        console.warn('[ai-ask] Failed to parse tool call arguments:', parseError);
        
        // Strategy 2: Try to extract JSON from malformed arguments
        const extracted = extractJsonFromText(toolCall.function.arguments as string);
        if (extracted) {
          output = normalizeOutput(extracted);
          parseMode = "extracted_json";
          console.log('[ai-ask] Extracted JSON from tool arguments');
        }
      }
    }
    
    // Strategy 3: Check for plain text response and try to extract JSON
    if (!output) {
      const textContent = data.choices?.[0]?.message?.content as string;
      if (textContent) {
        const extracted = extractJsonFromText(textContent);
        if (extracted) {
          output = normalizeOutput(extracted);
          parseMode = "extracted_json";
          console.log('[ai-ask] Extracted JSON from text content');
        }
      }
    }

    // Strategy 4: Retry with explicit JSON request
    if (!output) {
      console.log('[ai-ask] Retrying with explicit JSON request...');
      
      const retryMessages = [
        ...messages,
        { role: "assistant", content: data.choices?.[0]?.message?.content || "" },
        { role: "user", content: "Por favor, retorne sua resposta APENAS como JSON válido seguindo exatamente este schema: { assistant_text: string, actions: array, route: string, safety: { blocked: boolean, suggest_escalate: boolean } }" }
      ];

      try {
        const { data: retryData, tokensIn: retryIn, tokensOut: retryOut } = await makeAICall(
          LOVABLE_API_KEY, 
          retryMessages, 
          false // Don't use tools for retry
        );
        totalTokensIn += retryIn;
        totalTokensOut += retryOut;

        const retryText = retryData.choices?.[0]?.message?.content as string;
        if (retryText) {
          const extracted = extractJsonFromText(retryText);
          if (extracted) {
            output = normalizeOutput(extracted);
            parseMode = "retry_ok";
            console.log('[ai-ask] Successfully extracted JSON from retry');
          }
        }
      } catch (retryError) {
        console.error('[ai-ask] Retry failed:', retryError);
      }
    }

    // Strategy 5: Fallback to raw text with helpful guidance
    if (!output) {
      const rawText = data.choices?.[0]?.message?.content as string || 
                     (data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments as string) ||
                     "";
      
      // Clean up any partial JSON from the text
      const cleanedText = rawText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .replace(/^\{[\s\S]*\}$/m, '') // Remove JSON blocks
        .trim();

      const fallbackText = cleanedText || 
        "Entendi sua pergunta! Para te ajudar melhor, sugiro:\n\n" +
        "📋 Registre observações no app para acompanhamento\n" +
        "👨‍🌾 Consulte um agrônomo para orientação específica\n" +
        "📊 Verifique os relatórios disponíveis";

      output = {
        assistant_text: fallbackText,
        actions: [
          { type: 'escalate_agronomist' as const }
        ],
        route: 'fallback_text',
        safety: { blocked: false, suggest_escalate: true }
      };
      parseMode = "fallback_text";
      console.log('[ai-ask] Using fallback text response');
    }
  } else {
    // Non-structured output mode
    const text = data.choices?.[0]?.message?.content as string || "";
    output = {
      assistant_text: text,
      actions: [],
      route: 'general_agro',
      safety: { blocked: false, suggest_escalate: false }
    };
    parseMode = "schema_ok";
  }

  console.log('[ai-ask] AI response parsed:', { 
    route: output.route, 
    actionsCount: output.actions?.length || 0,
    safetyBlocked: output.safety?.blocked,
    parseMode
  });

  return { output, tokensIn: totalTokensIn, tokensOut: totalTokensOut, parseMode };
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

    const body: AIRequest = await req.json();
    const { workspace_id, farm_id, plot_id, user_message, photo_url, conversation_id } = body;

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
      plotId: plot_id,
      hasPhoto: !!photo_url,
      messageLength: user_message.length 
    });

    // 1. Check for blocked content (hard guardrails - deterministic)
    const blockedReason = checkBlockedContent(user_message);
    if (blockedReason) {
      console.log('[ai-ask] Blocked content detected:', blockedReason);
      
      // Log guardrail block (no tokens, just request count)
      if (workspace_id) {
        await incrementUsage(supabase, workspace_id, user.id, 'guardrail_block', 0, 0);
      }

      const response: AIResponse = {
        assistant_text: `⚠️ **Não posso fornecer prescrição ou recomendação técnica específica sobre "${blockedReason}".**\n\nPor razões de segurança e regulatórias, informações sobre doses, misturas de tanque, períodos de carência ou recomendações de produtos específicos devem ser fornecidas por um agrônomo responsável técnico.\n\n**O que você pode fazer:**\n✅ Consultar o agrônomo responsável pela sua fazenda\n✅ Verificar a bula/receituário do produto\n✅ Consultar o MAPA para informações oficiais\n\n📋 **Próximos passos sugeridos:**\n1. Faça uma inspeção detalhada da área\n2. Tire fotos dos sintomas encontrados\n3. Registre as ocorrências no sistema\n4. Envie o relatório para o agrônomo`,
        actions: [
          {
            type: 'escalate_agronomist',
            label: 'Perguntar ao Agrônomo',
          },
        ],
        flags: {
          show_escalate_to_agronomist: true,
          blocked_reason: blockedReason,
          decision_route: 'blocked_guardrail',
        },
        safety: {
          blocked: true,
          reason: blockedReason,
          suggest_escalate: true,
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
          { ...response.flags, safety: response.safety }
        );
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check quotas and feature flags
    if (workspace_id) {
      const flags = await getEffectiveFlags(supabase, workspace_id);
      
      // Check if AI is globally disabled
      if (!parseBooleanFlag(flags.ai_enabled, true)) {
        const response: AIResponse = {
          assistant_text: "🔒 **IA desativada pelo administrador.**\n\nO assistente de IA não está habilitado para sua conta. Entre em contato com o administrador para mais informações.",
          actions: [],
          flags: { decision_route: 'disabled' },
          safety: { blocked: true, reason: 'disabled', suggest_escalate: false },
        };
        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check for superadmin bypass or ai_admin_bypass flag
      const userIsSuperadmin = await isSuperadmin(supabase, user.id);
      const hasAdminBypass = parseBooleanFlag(flags.ai_admin_bypass, false);
      const bypassQuota = userIsSuperadmin || hasAdminBypass;

      if (bypassQuota) {
        console.log('[ai-ask] Quota bypassed - superadmin:', userIsSuperadmin, 'admin_bypass:', hasAdminBypass);
      }

      // Only check quota if user doesn't have bypass
      if (!bypassQuota) {
        const usage = await getTodayUsage(supabase, workspace_id, user.id);
        const limit = parseNumericFlag(flags.ai_daily_quota, 10);

        console.log('[ai-ask] Quota check - usage:', usage, 'limit:', limit);

        if (usage >= limit) {
          const response: AIResponse = {
            assistant_text: `📊 **Limite atingido.**\n\nVocê utilizou todas as ${limit} consultas diárias ao assistente. Seu limite será renovado amanhã.\n\n**Enquanto isso, você pode:**\n- Consultar nossos conteúdos técnicos\n- Enviar sua dúvida para um agrônomo`,
            actions: [
              { type: 'open_pricing', label: 'Ver Planos' },
              { type: 'escalate_agronomist', label: 'Perguntar ao Agrônomo' },
            ],
            flags: {
              show_escalate_to_agronomist: true,
              decision_route: 'quota_exceeded',
            },
            safety: { blocked: false, reason: 'quota_exceeded', suggest_escalate: true },
          };

          return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 3. Classify intent and build context
    const intent = classifyIntent(user_message);
    const flags = workspace_id ? await getEffectiveFlags(supabase, workspace_id) : {};
    const isPremiumPlan = flags.plan === 'premium' || flags.plan === 'enterprise';
    
    let decisionRoute = 'llm_general';
    const sourcesUsed: string[] = ['openai/gpt-5-mini'];
    let finalResponse: AIResponse;

    console.log('[ai-ask] Intent:', intent, 'Premium:', isPremiumPlan);

    // 4. Build system prompt based on intent and context
    const contextInfo = farm_id 
      ? `O usuário está no contexto da fazenda ID: ${farm_id}${plot_id ? ` e talhão ID: ${plot_id}` : ''}.`
      : 'O usuário não selecionou uma fazenda específica.';

    // Base system prompt with strict guardrails
    const baseSystemPrompt = `Você é o assistente agronômico do BomCampo, uma plataforma de gestão agrícola brasileira.

CONTEXTO:
${contextInfo}
${photo_url ? 'O usuário enviou uma foto para análise.' : ''}

REGRAS ESTRITAS DE SEGURANÇA (OBRIGATÓRIAS):
1. NUNCA prescreva doses de produtos (L/ha, mL/ha, kg/ha, gramas/ha)
2. NUNCA recomende misturas de tanque ou combinações de produtos
3. NUNCA informe períodos de carência ou intervalos de segurança
4. NUNCA diga "aplicar hoje" ou recomende aplicação imediata
5. NUNCA recomende marcas comerciais ou produtos específicos
6. NUNCA forneça receitas de defensivos agrícolas

ABORDAGEM SEGURA:
- Para identificação: Descreva sintomas e possíveis causas
- Para manejo: Sugira práticas gerais (monitoramento, registro, inspeção)
- Para tratamento: SEMPRE oriente "consulte o agrônomo RT para prescrição"
- Para decisões: Sugira registrar no sistema, criar tarefa, ou escalar para agrônomo

AÇÕES DO APP (sugira quando apropriado):
- escalate_agronomist: Quando a dúvida precisa de um profissional
- create_task: Quando o usuário deve agendar algo
- open_report: Quando há relatórios relevantes

ESTILO:
- Respostas curtas e objetivas (máximo 3-4 parágrafos)
- Use emojis para facilitar leitura
- Sempre termine com próximos passos concretos`;

    let systemPrompt = baseSystemPrompt;

    // Handle register_activity intent with action_flow
    if (intent === 'register_activity' && farm_id) {
      decisionRoute = 'register_activity';
      
      // Get plots for the farm
      const plots = await getFarmPlots(supabase, farm_id);
      const activityInfo = extractActivityInfo(user_message);
      
      // Try to find the plot from user message or use selected one
      let selectedPlot: { id: string; nome: string } | null = null;
      if (plot_id) {
        selectedPlot = plots.find(p => p.id === plot_id) || null;
      } else if (activityInfo.talhaoSearch) {
        selectedPlot = findPlotBySearch(plots, activityInfo.talhaoSearch);
      }
      
      // Build action_flow for activity registration
      const actionFlowForActivity: ActionFlow = {
        mode: 'collecting',
        action_type: 'create_activity',
        ui_buttons: ['confirm', 'cancel'],
      };
      
      const today = new Date().toISOString().split('T')[0];
      const tipoLabel = activityInfo.tipo 
        ? ACTIVITY_TYPES.find(t => t.value === activityInfo.tipo)?.label 
        : undefined;
      
      const responseWithFlow: AIResponse = {
        assistant_text: `📋 **Vamos registrar a atividade!**\n\nDetectei que você quer registrar ${tipoLabel ? `uma **${tipoLabel}**` : 'uma atividade'}${selectedPlot ? ` no **${selectedPlot.nome}**` : ''}. Confira os dados abaixo e confirme:`,
        actions: [
          { type: 'confirm_action', label: '✅ Salvar Atividade' },
          { type: 'cancel_draft', label: 'Cancelar' },
        ],
        action_flow: actionFlowForActivity,
        flags: {
          decision_route: 'register_activity',
          action_flow_data: {
            type: 'activity_registration',
            title: 'Registrar Atividade',
            fields: [
              {
                key: 'plot_id',
                label: 'Talhão',
                type: 'select',
                value: selectedPlot?.id || '',
                options: plots.map(p => ({ value: p.id, label: p.nome })),
                required: true,
              },
              {
                key: 'tipo',
                label: 'Tipo de Atividade',
                type: 'select',
                value: activityInfo.tipo || '',
                options: ACTIVITY_TYPES,
                required: true,
              },
              {
                key: 'data',
                label: 'Data',
                type: 'date',
                value: today,
                required: true,
              },
              {
                key: 'descricao',
                label: 'Descrição',
                type: 'text',
                value: activityInfo.descricao || '',
              },
              {
                key: 'observacoes',
                label: 'Observações',
                type: 'text',
                value: '',
              },
            ],
            confirm_label: 'Salvar Atividade',
            cancel_label: 'Cancelar',
          },
        },
        safety: { blocked: false, suggest_escalate: false },
      };

      // Save to conversation
      if (workspace_id) {
        await saveConversation(
          supabase,
          user.id,
          workspace_id,
          conversation_id || null,
          user_message,
          responseWithFlow.assistant_text,
          responseWithFlow.flags
        );
      }

      console.log('[ai-ask] Response sent:', {
        route: 'register_activity',
        sources: sourcesUsed,
        hasActionFlow: true,
      });

      return new Response(
        JSON.stringify(responseWithFlow),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add intent-specific instructions
    if (intent === 'operational') {
      decisionRoute = 'internal';
      systemPrompt += `\n\nFOCO DESTA CONVERSA: Ajudar com uso da plataforma BomCampo (cadastros, relatórios, configurações, navegação).`;
    } else if (intent === 'zoning' && flags.agritec_enabled && isPremiumPlan) {
      decisionRoute = 'agritec';
      sourcesUsed.push('agritec');
      systemPrompt += `\n\nFOCO DESTA CONVERSA: Zoneamento agrícola, janelas de plantio, cultivares indicadas. Cite ZARC/MAPA quando aplicável.`;
    } else if (intent === 'ndvi' && flags.satveg_enabled && isPremiumPlan) {
      decisionRoute = 'satveg';
      sourcesUsed.push('satveg');
      systemPrompt += `\n\nFOCO DESTA CONVERSA: Sensoriamento remoto, índices de vegetação (NDVI, EVI), análise de vigor.`;
    } else if (intent === 'agronomic' || photo_url) {
      decisionRoute = 'general_agro';
      systemPrompt += `\n\nFOCO DESTA CONVERSA: Dúvida agronômica. ${photo_url ? 'ANALISE A FOTO enviada e descreva o que observa, possíveis causas, mas NÃO prescreva tratamento.' : 'Ajude com identificação e próximos passos seguros.'}`;
    }

    // 5. Call LLM with structured output
    try {
      const { output, tokensIn, tokensOut, parseMode } = await callLovableAI(
        systemPrompt,
        user_message,
        photo_url
      );

      // Build actions from AI output + additional context
      const actions: AIAction[] = (output.actions || []).map(a => ({
        type: a.type as AIAction['type'],
        payload: a.payload,
        label: a.type === 'escalate_agronomist' ? 'Perguntar ao Agrônomo' :
               a.type === 'open_report' ? 'Ver Relatórios' :
               a.type === 'create_task' ? 'Criar Tarefa' :
               a.type === 'view_content' ? 'Ver Conteúdos' : undefined,
      }));

      // Add escalate option for agronomic questions if not already present
      if ((intent === 'agronomic' || photo_url || output.safety?.suggest_escalate) && 
          !actions.some(a => a.type === 'escalate_agronomist')) {
        actions.push({
          type: 'escalate_agronomist',
          label: 'Perguntar ao Agrônomo',
        });
      }

      // Check if AI actions are enabled and add action buttons
      const canDoActions = await canPerformAction(supabase, workspace_id || null, user.id, 'any');
      if (canDoActions) {
        if (/criar\s+(plantio|cultivo)|plantar/i.test(user_message) && !actions.some(a => a.type === 'start_action')) {
          actions.push({
            type: 'start_action',
            action_type: 'create_planting',
            label: '➕ Criar Plantio',
          });
        }
        if (/registrar\s+atividade|criar\s+atividade|nova\s+atividade/i.test(user_message) && !actions.some(a => a.type === 'start_action')) {
          actions.push({
            type: 'start_action',
            action_type: 'create_activity',
            label: '➕ Registrar Atividade',
          });
        }
      }

      // Handle action drafts
      let actionFlow: ActionFlow | undefined;
      if (body.action_draft_id) {
        const { data: draft } = await supabase
          .from('action_drafts')
          .select('*')
          .eq('id', body.action_draft_id)
          .single();

        if (draft) {
          const missingFields = draft.missing_fields || [];
          actionFlow = {
            mode: draft.status === 'awaiting_review' 
              ? 'awaiting_review' 
              : missingFields.length > 0 ? 'collecting' : 'confirming',
            draft_id: draft.id,
            action_type: draft.action_type,
            missing_fields: missingFields,
            summary_preview: `${draft.action_type}: ${JSON.stringify(draft.draft_json).substring(0, 100)}...`,
            ui_buttons: draft.status === 'awaiting_review'
              ? ['cancel']
              : missingFields.length > 0 
                ? ['cancel', 'open_full_form']
                : ['confirm', 'edit', 'cancel', 'send_to_agronomist'],
          };
        }
      }

      finalResponse = {
        assistant_text: output.assistant_text,
        actions,
        action_flow: actionFlow,
        flags: {
          show_escalate_to_agronomist: output.safety?.suggest_escalate || intent === 'agronomic' || !!photo_url,
          decision_route: output.route || decisionRoute,
          sources_used: sourcesUsed,
          ai_actions_enabled: canDoActions,
          parse_mode: parseMode,
        },
        safety: output.safety,
      };

      // 6. Record usage
      if (workspace_id) {
        await incrementUsage(supabase, workspace_id, user.id, 'openai_gpt5mini', tokensIn, tokensOut);
      }

      // 7. Save conversation
      if (workspace_id) {
        await saveConversation(
          supabase,
          user.id,
          workspace_id,
          conversation_id || null,
          user_message,
          output.assistant_text,
          { ...finalResponse.flags, safety: output.safety }
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
          { type: 'escalate_agronomist', label: 'Perguntar ao Agrônomo' },
        ],
        flags: {
          show_escalate_to_agronomist: true,
          decision_route: 'error_fallback',
        },
        safety: { blocked: false, suggest_escalate: true },
      };
    }

    console.log('[ai-ask] Response sent:', { 
      route: finalResponse.flags.decision_route,
      sources: finalResponse.flags.sources_used,
      actionsCount: finalResponse.actions.length,
      safetyBlocked: finalResponse.safety?.blocked
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
