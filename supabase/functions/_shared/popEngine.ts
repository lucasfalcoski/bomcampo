// =============================================
// POP ENGINE V1: Router + Safety Gate + AI Fallback
// =============================================

// ========== INTERFACES ==========
export interface PopMatch {
  match_type: 'pop' | 'category' | 'ai' | 'fallback';
  pop?: {
    id: string;
    slug: string;
    title: string;
    category: string;
    content_markdown: string | null;
    triage_questions: string[];
    actions: Array<{ type: string; label: string }>;
  };
  category?: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
  score: number;
  matched_keywords: string[];
  is_sensitive: boolean;
}

export interface AIStructuredResponse {
  title: string;
  summary: string;
  possible_causes: string[];
  do_now_24h: string[];
  avoid_now: string[];
  next_7_days: string[];
  triage_questions: string[];
  risk_level: 'baixa' | 'media' | 'alta';
  disclaimer: string;
}

export interface PopEngineResult {
  match: PopMatch;
  ai_response?: AIStructuredResponse;
  ai_status: 'success' | 'retry' | 'failed' | 'skipped';
  response_time_ms: number;
}

// ========== SAFETY GATE ==========
// Keywords that indicate sensitive topics requiring RT/agronomist consultation
const SENSITIVE_KEYWORDS = [
  // Defensivos gerais
  'inseticida', 'fungicida', 'herbicida', 'pesticida', 'agrotóxico', 'agrotoxico',
  'defensivo', 'veneno', 'produto químico', 'produto quimico',
  
  // Doses e aplicação
  'dose', 'dosagem', 'quantidade', 'litros por hectare', 'ml por hectare',
  'gramas por hectare', 'kg por hectare', 'taxa de aplicação', 'taxa de aplicacao',
  
  // Equipamento de aplicação
  'calda', 'tanque', 'mistura de tanque', 'mistura tanque', 'bico', 'pressao',
  'adjuvante', 'surfactante', 'espalhante',
  
  // Ingredientes ativos e marcas
  'ingrediente ativo', 'principio ativo', 'princípio ativo',
  'glifosato', 'roundup', '2,4-d', 'paraquat', 'atrazina',
  'imidacloprido', 'tiametoxam', 'clorpirifos', 'lambda-cialotrina',
  'azoxistrobina', 'trifloxistrobina', 'tebuconazol', 'ciproconazol',
  
  // Receituário
  'receita agronomica', 'receituário', 'receituario', 'art', 'crea',
  
  // Carência e segurança
  'carencia', 'carência', 'intervalo de segurança', 'periodo de carencia',
  'período de carência', 'dias antes da colheita',
  
  // Perguntas diretas sobre produtos
  'qual produto', 'que produto', 'qual veneno', 'que veneno',
  'melhor produto', 'melhor marca', 'produto mais eficaz',
  'o que aplicar', 'o que passar', 'o que jogar',
];

// Strong triggers - single match is enough to flag as sensitive
const STRONG_SENSITIVE_TRIGGERS = [
  'dose', 'dosagem', 'calda', 'mistura de tanque', 'receita',
  'inseticida', 'fungicida', 'herbicida', 'agrotóxico', 'agrotoxico',
  'ingrediente ativo', 'principio ativo', 'qual produto aplicar',
];

/**
 * Safety Gate: Detect if question involves sensitive topics
 * (pesticides, doses, prescriptions, etc.)
 */
export function isSensitive(question: string): boolean {
  const normalized = normalizeText(question);
  
  // Check for strong triggers (single match = sensitive)
  for (const trigger of STRONG_SENSITIVE_TRIGGERS) {
    const normalizedTrigger = normalizeText(trigger);
    if (normalized.includes(normalizedTrigger)) {
      console.log(`[SafetyGate] Strong trigger detected: "${trigger}"`);
      return true;
    }
  }
  
  // Check for weak triggers (need 2+ matches)
  let sensitiveMatches = 0;
  const matchedKeywords: string[] = [];
  
  for (const keyword of SENSITIVE_KEYWORDS) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalized.includes(normalizedKeyword)) {
      sensitiveMatches++;
      matchedKeywords.push(keyword);
    }
  }
  
  if (sensitiveMatches >= 2) {
    console.log(`[SafetyGate] Multiple sensitive keywords detected: ${matchedKeywords.join(', ')}`);
    return true;
  }
  
  return false;
}

/**
 * Generate safe response for sensitive topics
 */
export function getSafeResponse(question: string): AIStructuredResponse {
  return {
    title: "Orientação sobre Defensivos e Aplicações",
    summary: "Este tema envolve produtos regulados que exigem Receituário Agronômico emitido por profissional habilitado (Engenheiro Agrônomo com ART).",
    possible_causes: [
      "A escolha do produto depende de diagnóstico preciso da praga/doença",
      "Doses variam conforme cultura, estágio, volume de calda e equipamento",
      "Condições climáticas influenciam eficácia e segurança da aplicação"
    ],
    do_now_24h: [
      "**Documente o problema**: tire fotos detalhadas (perto e de longe)",
      "**Identifique a praga/doença**: use as perguntas abaixo para refinar o diagnóstico",
      "**Monitore o nível de infestação**: conte indivíduos em pontos amostrais",
      "**Consulte seu agrônomo RT** para receituário adequado"
    ],
    avoid_now: [
      "Aplicar produtos sem identificação correta do alvo",
      "Usar doses diferentes das recomendadas em bula",
      "Misturar produtos sem orientação técnica",
      "Aplicar em condições climáticas inadequadas (vento, chuva iminente)"
    ],
    next_7_days: [
      "Obtenha Receituário Agronômico com seu RT",
      "Verifique período de carência antes da colheita",
      "Considere alternativas de MIP/MID (controle biológico, cultural)",
      "Registre todas as aplicações no caderno de campo"
    ],
    triage_questions: [
      "Qual cultura e estágio fenológico atual?",
      "Qual praga ou doença você suspeita? Consegue descrever os sintomas?",
      "Qual o nível de infestação (leve, moderado, severo)?",
      "Quanto tempo até a colheita prevista?",
      "Possui acesso a agrônomo responsável técnico (RT)?"
    ],
    risk_level: "alta",
    disclaimer: "⚠️ **IMPORTANTE**: Recomendações de defensivos agrícolas exigem Receituário Agronômico. Consulte sempre seu agrônomo RT para prescrição adequada conforme legislação vigente (Lei 7.802/89)."
  };
}

// ========== TEXT PROCESSING ==========
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(' ').filter(t => t.length > 2);
}

// ========== SIMPLIFIED MATCHING V1 ==========
/**
 * Simple keyword matching:
 * - Returns count of matching keywords
 * - Checks for "strong" triggers (single match is enough)
 */
export function matchKeywords(
  question: string,
  keywords: string[]
): { count: number; matched: string[]; hasStrongMatch: boolean } {
  const normalizedQuestion = normalizeText(question);
  const matched: string[] = [];
  let hasStrongMatch = false;
  
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);
    
    // Check if keyword appears in question
    if (normalizedQuestion.includes(normalizedKeyword)) {
      matched.push(keyword);
      
      // Check if it's a "strong" keyword (usually longer, more specific)
      if (normalizedKeyword.length >= 6 || keyword.split(' ').length >= 2) {
        hasStrongMatch = true;
      }
    }
  }
  
  return { count: matched.length, matched, hasStrongMatch };
}

// ========== ROUTER V1 ==========
/**
 * Route question to best POP or category
 * Flow: POP específico → POP por categoria → AI fallback → fallback padrão
 */
// deno-lint-ignore no-explicit-any
export async function routeQuestion(
  supabase: any,
  question: string,
  selectedCrop?: string
): Promise<PopMatch> {
  const startTime = Date.now();
  const sensitive = isSensitive(question);
  
  console.log(`[Router V1] Question: "${question.substring(0, 60)}..." | Sensitive: ${sensitive}`);
  
  // 1. Try to match specific POP by triggers
  const { data: pops } = await supabase
    .from('pops')
    .select(`
      id, slug, title, category, content_markdown, 
      triage_questions, actions, triggers, crops, keywords, category_id
    `)
    .eq('is_active', true)
    .is('workspace_id', null);
  
  let bestPop: PopMatch['pop'] | undefined;
  let bestPopScore = 0;
  let bestPopMatched: string[] = [];
  
  for (const pop of pops || []) {
    // Combine triggers and keywords for matching
    const allKeywords = [...(pop.triggers || []), ...(pop.keywords || [])];
    const { count, matched, hasStrongMatch } = matchKeywords(question, allKeywords);
    
    // Crop bonus
    let cropBonus = 0;
    if (selectedCrop && pop.crops?.includes(selectedCrop.toLowerCase())) {
      cropBonus = 1;
    }
    
    // Score calculation
    const score = count + cropBonus;
    
    // Threshold: >= 2 matches OR 1 strong match
    const meetsThreshold = count >= 2 || (hasStrongMatch && count >= 1);
    
    if (meetsThreshold && score > bestPopScore) {
      bestPopScore = score;
      bestPopMatched = matched;
      bestPop = {
        id: pop.id,
        slug: pop.slug,
        title: pop.title,
        category: pop.category,
        content_markdown: pop.content_markdown,
        triage_questions: pop.triage_questions || [],
        actions: pop.actions || [],
      };
      
      console.log(`[Router V1] POP match: ${pop.slug} (score: ${score}, matched: ${matched.join(', ')})`);
    }
  }
  
  // If we found a specific POP, return it
  if (bestPop) {
    return {
      match_type: 'pop',
      pop: bestPop,
      score: bestPopScore,
      matched_keywords: bestPopMatched,
      is_sensitive: sensitive,
    };
  }
  
  // 2. Try to match category
  const { data: categories } = await supabase
    .from('pop_categories')
    .select('id, name, description, keywords, icon')
    .order('priority');
  
  let bestCategory: PopMatch['category'] | undefined;
  let bestCategoryMatched: string[] = [];
  
  for (const cat of categories || []) {
    const { count, matched } = matchKeywords(question, cat.keywords || []);
    
    // Threshold: >= 1 match for category
    if (count >= 1 && !bestCategory) {
      bestCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
      };
      bestCategoryMatched = matched;
      
      console.log(`[Router V1] Category match: ${cat.name} (matched: ${matched.join(', ')})`);
    }
  }
  
  // If we found a category, try to find a generic POP for it
  if (bestCategory) {
    // Look for a generic POP in this category
    const categoryPops = (pops || []).filter((p: { category: string }) => 
      p.category?.toLowerCase() === bestCategory!.name.toLowerCase()
    );
    
    if (categoryPops.length > 0) {
      // Return the first POP from this category as a generic response
      const genericPop = categoryPops[0];
      return {
        match_type: 'category',
        pop: {
          id: genericPop.id,
          slug: genericPop.slug,
          title: genericPop.title,
          category: genericPop.category,
          content_markdown: genericPop.content_markdown,
          triage_questions: genericPop.triage_questions || [],
          actions: genericPop.actions || [],
        },
        category: bestCategory,
        score: 1,
        matched_keywords: bestCategoryMatched,
        is_sensitive: sensitive,
      };
    }
    
    // Category found but no POP - will use AI with category context
    return {
      match_type: 'category',
      category: bestCategory,
      score: 1,
      matched_keywords: bestCategoryMatched,
      is_sensitive: sensitive,
    };
  }
  
  // 3. No match - will use AI
  console.log('[Router V1] No POP or category match, will use AI fallback');
  return {
    match_type: 'ai',
    score: 0,
    matched_keywords: [],
    is_sensitive: sensitive,
  };
}

// ========== AI FALLBACK ==========
const AI_RESPONSE_SCHEMA = `{
  "title": "string (título curto do problema)",
  "summary": "string (2-3 linhas resumindo a situação)",
  "possible_causes": ["causa 1", "causa 2", "causa 3"],
  "do_now_24h": ["ação 1", "ação 2"],
  "avoid_now": ["evitar 1", "evitar 2"],
  "next_7_days": ["passo 1", "passo 2"],
  "triage_questions": ["pergunta 1", "pergunta 2", "pergunta 3"],
  "risk_level": "baixa|media|alta",
  "disclaimer": "Consulte o agrônomo RT para decisões de aplicação."
}`;

/**
 * Call AI with structured output
 * - Forces JSON return
 * - Validates response
 * - Retries once if invalid
 * - If sensitive, adds extra guardrails
 */
export async function callAIStructured(
  question: string,
  category?: string,
  apiKey?: string,
  isSensitiveQuestion?: boolean
): Promise<{ response: AIStructuredResponse | null; status: 'success' | 'retry' | 'failed' }> {
  if (!apiKey) {
    console.log('[AI Fallback] No API key provided');
    return { response: null, status: 'failed' };
  }
  
  // Extra guardrails for sensitive questions
  const sensitiveGuardrail = isSensitiveQuestion ? `
ATENÇÃO - REGRAS DE SEGURANÇA OBRIGATÓRIAS:
- NÃO mencione nomes de produtos comerciais
- NÃO indique doses ou concentrações
- NÃO sugira misturas de tanque
- NÃO prescreva frequência de aplicação
- SEMPRE recomende consultar agrônomo RT para receituário
- Foque em MIP/MID: monitoramento, nível de dano, controle cultural/biológico
` : '';
  
  const systemPrompt = `Você é um assistente agronômico experiente do BomCampo.
Responda SEMPRE em JSON válido seguindo EXATAMENTE este schema:
${AI_RESPONSE_SCHEMA}

REGRAS IMPORTANTES:
1. NUNCA prescreva doses, produtos específicos ou misturas de tanque
2. Seja prático: "o que pode ser" + "o que fazer agora" + "o que evitar"
3. Para tratamentos químicos, oriente "consulte o agrônomo RT"
4. Mantenha tom profissional mas acessível
${category ? `5. Foco na categoria: ${category}` : ''}
${sensitiveGuardrail}

Retorne APENAS o JSON, sem markdown, sem explicações.`;

  // First attempt
  console.log('[AI Fallback] Calling AI...');
  let aiResponse = await fetchAI(apiKey, systemPrompt, question);
  let parsed = tryParseJSON(aiResponse);
  
  if (parsed) {
    console.log('[AI Fallback] Success on first attempt');
    return { response: parsed, status: 'success' };
  }
  
  // Retry with correction prompt
  console.log('[AI Fallback] First attempt failed, retrying...');
  const retryPrompt = `Sua resposta anterior não era JSON válido. 
Responda APENAS com JSON válido seguindo este schema:
${AI_RESPONSE_SCHEMA}

Pergunta original: ${question}

Retorne APENAS o JSON, nada mais.`;

  aiResponse = await fetchAI(apiKey, systemPrompt, retryPrompt);
  parsed = tryParseJSON(aiResponse);
  
  if (parsed) {
    console.log('[AI Fallback] Success on retry');
    return { response: parsed, status: 'retry' };
  }
  
  console.log('[AI Fallback] Both attempts failed');
  return { response: null, status: 'failed' };
}

async function fetchAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_completion_tokens: 1000,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Fallback] API error ${response.status}: ${errorText}`);
      return '';
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[AI Fallback] Fetch error:', error);
    return '';
  }
}

function tryParseJSON(text: string): AIStructuredResponse | null {
  if (!text) return null;
  
  try {
    // Try direct parse
    const parsed = JSON.parse(text);
    if (isValidAIResponse(parsed)) return parsed;
  } catch {
    // Try to extract JSON from text
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (isValidAIResponse(parsed)) return parsed;
      } catch {
        // Ignore
      }
    }
  }
  
  return null;
}

function isValidAIResponse(obj: unknown): obj is AIStructuredResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.title === 'string' &&
    typeof o.summary === 'string' &&
    Array.isArray(o.possible_causes) &&
    Array.isArray(o.do_now_24h) &&
    Array.isArray(o.avoid_now)
  );
}

// ========== DEFAULT FALLBACK ==========
/**
 * Default fallback when everything fails
 * NEVER shows error messages - always provides useful guidance
 */
export function getDefaultFallback(_question: string): AIStructuredResponse {
  return {
    title: "Orientação Geral de Campo",
    summary: "Vamos analisar sua situação com um checklist seguro de diagnóstico e próximos passos.",
    possible_causes: [
      "Condições climáticas desfavoráveis (temperatura, umidade, chuvas)",
      "Problema nutricional ou hídrico no solo/planta",
      "Possível ataque de praga ou início de doença"
    ],
    do_now_24h: [
      "Tire fotos detalhadas: de perto (sintoma) e de longe (área afetada)",
      "Verifique se o problema é localizado ou espalhado pelo talhão"
    ],
    avoid_now: [
      "Não aplique produtos sem diagnóstico confirmado",
      "Evite operações que possam agravar (irrigação excessiva, máquinas em solo úmido)"
    ],
    next_7_days: [
      "Monitore a evolução dos sintomas diariamente",
      "Consulte o agrônomo responsável técnico (RT)",
      "Registre a ocorrência para histórico do talhão"
    ],
    triage_questions: [
      "O problema é localizado em uma área ou está espalhado?",
      "Há quanto tempo você notou esses sintomas?",
      "Houve alguma mudança recente (clima, aplicação, irrigação)?"
    ],
    risk_level: "media",
    disclaimer: "⚠️ Consulte o agrônomo RT para decisões de aplicação e tratamento."
  };
}

// ========== FORMATTERS ==========
export function formatAIResponseToMarkdown(response: AIStructuredResponse): string {
  const lines: string[] = [];
  
  lines.push(`## ${response.title}`);
  lines.push('');
  lines.push(response.summary);
  lines.push('');
  
  if (response.possible_causes?.length) {
    lines.push('### 🔍 O que pode ser');
    response.possible_causes.forEach(c => lines.push(`- ${c}`));
    lines.push('');
  }
  
  if (response.do_now_24h?.length) {
    lines.push('### ✅ O que fazer agora (0-24h)');
    response.do_now_24h.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
    lines.push('');
  }
  
  if (response.avoid_now?.length) {
    lines.push('### ⛔ O que evitar');
    response.avoid_now.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  }
  
  if (response.next_7_days?.length) {
    lines.push('### 📅 Próximos 7 dias');
    response.next_7_days.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  }
  
  if (response.triage_questions?.length) {
    lines.push('### ❓ Perguntas para confirmar');
    response.triage_questions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
    lines.push('');
  }
  
  lines.push(`---\n${response.disclaimer}`);
  
  return lines.join('\n');
}

export function formatPopToMarkdown(pop: NonNullable<PopMatch['pop']>): string {
  if (pop.content_markdown) {
    return pop.content_markdown;
  }
  
  return `## ${pop.title}\n\nConsulte este POP para orientações detalhadas.`;
}

// ========== LOGGING ==========
// deno-lint-ignore no-explicit-any
export async function logPopUsage(
  supabase: any,
  userId: string,
  workspaceId: string | null,
  farmId: string | null,
  fieldId: string | null,
  question: string,
  match: PopMatch,
  usedAI: boolean,
  aiStatus: 'success' | 'retry' | 'failed' | 'skipped',
  responseTimeMs: number
): Promise<void> {
  try {
    await supabase.from('pop_usage_logs').insert({
      user_id: userId,
      workspace_id: workspaceId,
      farm_id: farmId,
      field_id: fieldId,
      question: question.substring(0, 500),
      matched_pop_id: match.pop?.id || null,
      matched_category_id: match.category?.id || null,
      match_type: match.match_type,
      match_score: match.score,
      used_ai: usedAI,
      ai_status: aiStatus,
      response_time_ms: responseTimeMs,
    });
    console.log(`[Log] Saved: type=${match.match_type}, sensitive=${match.is_sensitive}, ai=${usedAI}`);
  } catch (error) {
    console.error('[Log] Error saving usage:', error);
  }
}
