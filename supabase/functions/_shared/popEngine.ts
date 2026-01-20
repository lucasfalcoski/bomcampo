// =============================================
// POP ENGINE: Router + AI Fallback
// =============================================

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

// Text normalization
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\\w\\s]/g, ' ') // Remove punctuation
    .replace(/\\s+/g, ' ')
    .trim();
}

// Tokenize text
export function tokenize(text: string): string[] {
  const normalized = normalizeText(text);
  return normalized.split(' ').filter(t => t.length > 2);
}

// Calculate keyword match score
export function calculateScore(
  queryTokens: string[],
  targetKeywords: string[]
): { score: number; matched: string[] } {
  const normalizedKeywords = targetKeywords.map(k => normalizeText(k));
  const matched: string[] = [];
  let score = 0;
  
  for (const token of queryTokens) {
    for (let i = 0; i < normalizedKeywords.length; i++) {
      const keyword = normalizedKeywords[i];
      // Exact match
      if (keyword === token) {
        score += 3;
        matched.push(targetKeywords[i]);
      }
      // Partial match (token is contained in keyword or vice versa)
      else if (keyword.includes(token) || token.includes(keyword)) {
        score += 1.5;
        if (!matched.includes(targetKeywords[i])) {
          matched.push(targetKeywords[i]);
        }
      }
    }
  }
  
  // Normalize score based on query length
  const normalizedScore = queryTokens.length > 0 ? score / queryTokens.length : 0;
  
  return { score: normalizedScore, matched: [...new Set(matched)] };
}

// Route question to best POP or category
// deno-lint-ignore no-explicit-any
export async function routeQuestion(
  supabase: any,
  question: string,
  selectedCrop?: string
): Promise<PopMatch> {
  const queryTokens = tokenize(question);
  const startTime = Date.now();
  
  // 1. Try to match POPs with triggers
  const { data: pops } = await supabase
    .from('pops')
    .select(`
      id, slug, title, category, content_markdown, 
      triage_questions, actions, triggers, crops, keywords
    `)
    .eq('is_active', true)
    .is('workspace_id', null);
  
  let bestPop: PopMatch['pop'] | undefined;
  let bestPopScore = 0;
  let bestPopMatched: string[] = [];
  
  for (const pop of pops || []) {
    // Combine triggers and keywords for matching
    const allKeywords = [...(pop.triggers || []), ...(pop.keywords || [])];
    const { score, matched } = calculateScore(queryTokens, allKeywords);
    
    // Bonus if crop matches
    let cropBonus = 0;
    if (selectedCrop && pop.crops?.includes(selectedCrop.toLowerCase())) {
      cropBonus = 0.5;
    }
    
    const totalScore = score + cropBonus;
    
    if (totalScore > bestPopScore && totalScore >= 1.5) {
      bestPopScore = totalScore;
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
    }
  }
  
  // Threshold for POP match
  if (bestPop && bestPopScore >= 2.0) {
    return {
      match_type: 'pop',
      pop: bestPop,
      score: bestPopScore,
      matched_keywords: bestPopMatched,
    };
  }
  
  // 2. Try to match categories
  const { data: categories } = await supabase
    .from('pop_categories')
    .select('id, name, description, keywords, icon')
    .order('priority');
  
  let bestCategory: PopMatch['category'] | undefined;
  let bestCategoryScore = 0;
  let bestCategoryMatched: string[] = [];
  
  for (const cat of categories || []) {
    const { score, matched } = calculateScore(queryTokens, cat.keywords || []);
    
    if (score > bestCategoryScore) {
      bestCategoryScore = score;
      bestCategoryMatched = matched;
      bestCategory = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
      };
    }
  }
  
  // Threshold for category match
  if (bestCategory && bestCategoryScore >= 1.0) {
    // If we have a weak POP match, include it too
    return {
      match_type: bestPop ? 'pop' : 'category',
      pop: bestPop,
      category: bestCategory,
      score: bestPop ? bestPopScore : bestCategoryScore,
      matched_keywords: bestPop ? bestPopMatched : bestCategoryMatched,
    };
  }
  
  // 3. No match - will use AI
  return {
    match_type: 'ai',
    score: 0,
    matched_keywords: [],
  };
}

// AI Structured Response Schema
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

// Call AI with structured output
export async function callAIStructured(
  question: string,
  category?: string,
  apiKey?: string
): Promise<{ response: AIStructuredResponse | null; status: 'success' | 'retry' | 'failed' }> {
  if (!apiKey) {
    return { response: null, status: 'failed' };
  }
  
  const systemPrompt = `Você é um assistente agronômico experiente do BomCampo.
Responda SEMPRE em JSON válido seguindo EXATAMENTE este schema:
${AI_RESPONSE_SCHEMA}

REGRAS IMPORTANTES:
1. NUNCA prescreva doses, produtos específicos ou misturas de tanque
2. Seja prático: "o que pode ser" + "o que fazer agora" + "o que evitar"
3. Para tratamentos químicos, oriente "consulte o agrônomo RT"
4. Mantenha tom profissional mas acessível
${category ? `5. Foco na categoria: ${category}` : ''}

Retorne APENAS o JSON, sem markdown, sem explicações.`;

  // First attempt
  let aiResponse = await fetchAI(apiKey, systemPrompt, question);
  let parsed = tryParseJSON(aiResponse);
  
  if (parsed) {
    return { response: parsed, status: 'success' };
  }
  
  // Retry with correction prompt
  console.log('[popEngine] First AI attempt failed, retrying with correction...');
  const retryPrompt = `Sua resposta anterior não era JSON válido. 
Responda APENAS com JSON válido seguindo este schema:
${AI_RESPONSE_SCHEMA}

Pergunta original: ${question}

Retorne APENAS o JSON, nada mais.`;

  aiResponse = await fetchAI(apiKey, systemPrompt, retryPrompt);
  parsed = tryParseJSON(aiResponse);
  
  if (parsed) {
    return { response: parsed, status: 'retry' };
  }
  
  console.log('[popEngine] AI retry also failed');
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
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_completion_tokens: 800,
        temperature: 0.3, // Lower for more consistent JSON
      }),
    });
    
    if (!response.ok) {
      throw new Error(`AI response not ok: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('[popEngine] AI fetch error:', error);
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

// Default fallback response (when everything fails)
export function getDefaultFallback(question: string): AIStructuredResponse {
  return {
    title: "Orientação Geral de Campo",
    summary: "Não consegui acessar a resposta completa agora, mas aqui vai um checklist seguro para sua situação.",
    possible_causes: [
      "Condições climáticas desfavoráveis",
      "Problema nutricional ou hídrico",
      "Possível ataque de praga ou doença"
    ],
    do_now_24h: [
      "Tire fotos detalhadas (perto e longe) para documentar",
      "Verifique se o problema é localizado ou espalhado"
    ],
    avoid_now: [
      "Não aplique produtos sem diagnóstico confirmado",
      "Evite irrigação excessiva se não souber a causa"
    ],
    next_7_days: [
      "Monitore a evolução dos sintomas",
      "Consulte o agrônomo responsável técnico",
      "Registre a ocorrência para histórico"
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

// Format AI response to markdown
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

// Format POP content to chat response
export function formatPopToMarkdown(pop: NonNullable<PopMatch['pop']>): string {
  // If content_markdown exists, use it directly
  if (pop.content_markdown) {
    return pop.content_markdown;
  }
  
  // Otherwise, create a simple placeholder
  return `## ${pop.title}\n\nConsulte este POP para orientações detalhadas.`;
}

// Log usage
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
  } catch (error) {
    console.error('[popEngine] Error logging usage:', error);
  }
}
