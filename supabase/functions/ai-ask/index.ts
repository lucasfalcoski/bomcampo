import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getTodayBRT, AI_USAGE_SOURCE } from "../_shared/date.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== GUARDRAILS ==========
const BLOCKED_PATTERNS = [
  /dose\s*(de|do|da|para|por|recomendada)?/i,
  /quanto\s+(aplicar|usar|colocar)/i,
  /quantos?\s+(litros?|ml|gramas?|kg)/i,
  /dosagem/i,
  /taxa\s+de\s+aplica[çc][ãa]o/i,
  /mistura\s+(de\s+)?tanque/i,
  /misturar?\s+(com|produto)/i,
  /combina[çc][ãa]o\s+de\s+(produtos?|defensivos?)/i,
  /calda/i,
  /adjuvante/i,
  /car[êe]ncia/i,
  /intervalo\s+de\s+seguran[çc]a/i,
  /per[ií]odo\s+de\s+car[êe]ncia/i,
  /dias?\s+(antes|ap[óo]s)\s+(colheita|aplicar)/i,
  /receita\s+(de|para)/i,
  /qual\s+(produto|defensivo|fungicida|inseticida|herbicida)\s+(usar|aplicar|comprar)/i,
  /melhor\s+(produto|defensivo|marca)/i,
  /nome\s+comercial/i,
  /registro\s+no\s+mapa/i,
];

// ========== INTENT PATTERNS ==========
const INTENT_PATTERNS = {
  register_activity: [
    /fiz(emos)?\s+(uma?\s*)?(limp[ea]?[sz]?[ao]?|ro[çc]a(da|gem)?|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina|irriga[çc][ãa]o|poda|preparo|desbrota|replantio)/i,
    /realizei?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina)/i,
    /foi\s+feit[ao]\s+(uma?\s*)?(limpeza|ro[çc]a(da|gem)?|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|carreiro|regulagem|revis[ãa]o)/i,
    /registr(ar?|ei|amos)\s+(uma?\s*)?(atividade|limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o)/i,
    /anota(r)?\s+(a[ií]?|que)?\s*(atividade|limpeza|ro[çc]a(da|gem)?|aduba[çc][ãa]o|hoje|hj)/i,
    /lan[çc]ar\s+(atividade|trabalho)/i,
    /hoje\s+(fiz|fizemos|realizamos)/i,
    /aplicamos\s+(adubo|fertilizante|calc[áa]rio)/i,
    /colhemos|plantamos|irrigamos|podamos|adubei|capinei|irriguei/i,
    /t\d+:\s*(limpeza|ro[çc]a|poda|aduba|feita?|conclu[íi]da)/i,
    /(talhao|talh[ãa]o)\s*\d+\s*(limpeza|ro[çc]a|poda|conclu[íi]d[ao]|feit[ao]|agora|hj)/i,
    /consert(ei|amos)\s+(cano|bomba|porteira|cerca)/i,
    /fiz\s+manuten[çc][ãa]o\s+(na|no|da|do)/i,
    /troca\s+(de\s+)?(bico|[óo]leo|rolamento)/i,
    /lavagem\s+(do|da)\s+(pulverizador|epi|m[áa]quina)/i,
    /(desentupimos|sangria|revis[ãa]o|regulagem)\s+(gotejador|aspersor|gotejo|linha)/i,
    /vistoria\s+(das?\s+)?(mangueira|gotejo|irriga)/i,
    /limpeza\s+(do\s+)?terreiro/i,
    /coleta\s+(de\s+)?(amostra|solo|folha)/i,
    /registra\s*[.:,]?\s*(ro[çc]a|poda|limpeza|capina|aduba|irriga|colheita)/i,
    /anota\s*[.:,]?\s*que\s+(hoje\s+)?(fiz|fizemos|realizamos)/i,
    /(roça|rocada|ro[çc]agem)\s+(feit[ao]|conclu[íi]d[ao])/i,
    /(poda|desbrota|amarr[açã][ãa]o)\s+(feit[ao]|conclu[íi]d[ao]|finalizada)/i,
    /fechamos\s+(buraco|cerca|dreno)/i,
    /retir(amos|ada)\s+(entulho|planta)/i,
    /colocamos\s+(cobertura|armadilha)/i,
    /instalamos\s+(armadilha|cerca|gotejo)/i,
    /organizamos\s+(estoque|galp[ãa]o)/i,
    /controle\s+(de\s+)?formiga\s+feit/i,
    /lubrifica[çc][ãa]o\s+(do\s+)?trator/i,
    /carregamos\s+adubo/i,
    /aterramos\s+(um\s+)?trecho/i,
    /(arrumamos|consertamos|limpamos|lavamos|trocamos|fizemos|realizamos|terminamos|conclu[íi]mos)/i,
  ],
  create_task: [
    /me\s+lembr(a|e)/i,
    /cria(r)?\s+(uma?\s*)?(tarefa|checklist|lembrete)/i,
    /agendar?\s+(manutenção|visita|inspe[çc][ãa]o|treinamento|limpeza)/i,
    /monitorar/i,
    /preciso\s+(lembrar|agendar|fazer)/i,
    /n[ãa]o\s+esquecer/i,
    /colocar?\s+(na|no)\s+(agenda|calend[áa]rio)/i,
    /programar/i,
    /tarefa\s+(para|de|semanal|:)/i,
    /checklist\s+(de|para|p[óo]s|pr[ée])/i,
    /lembrete\s*[.:,]?\s*(para|pra|de)?/i,
    /agenda(r)?\s+(visita|inspe[çc][ãa]o|treinamento|limpeza|manutenção)/i,
    /criar\s+(tarefa|lembrete|checklist)/i,
    /cria\s+tarefa\s+(pra|para)/i,
    /tarefa\s*:\s*(checar|revisar|monitorar|verificar|limpar)/i,
    /coloca\s+pra\s+(eu|mim)\s+(registrar|lembrar|verificar)/i,
  ],
  open_screen: [
    /abr(e|a|ir)\s+(a\s+)?(tela\s+de\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es|fazendas|dashboard|atividades|ocorr[êe]ncias|plantios|tarefas)/i,
    /mostrar?\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|atividades|tarefas|alertas)/i,
    /ver\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es|hist[óo]rico|custos|receita|consumo)/i,
    /ir\s+para\s+(clima|relat[óo]rios?|pre[çc]os|financeiro)/i,
    /quero\s+(ver|acessar)\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|atividades|tarefas|alertas|painel|calend[áa]rio)/i,
    /acessar\s+(o\s+)?(m[óo]dulo|tela|[áa]rea)\s+(de\s+)?(clima|financeiro|plantios|atividades)/i,
    /relat[óo]rio\s+(mensal|por\s+talh[ãa]o|de\s+despesas|semanal)/i,
    /lista\s+(de\s+)?(ocorr[êe]ncias|tarefas|atividades)/i,
    /gerenciar\s+usu[áa]rios/i,
    /v[íi]nculo\s+(do\s+)?agr[ôo]nomo/i,
    /abr(e|ir)\s+(admin|integra[çc][õo]es|auditoria)/i,
    /abre\s+(clima|talh[õo]es|plantios|financeiro|relat[óo]rios?)/i,
    /dashboard\s+geral/i,
    /painel\s+(do\s+)?b2b/i,
  ],
  high_risk_today: [
    /posso\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|passar|mexer|secar)\s*(hoje|agora|hj|cedo)?/i,
    /d[áa]\s+(para|pra)\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|plantar|secar)\s*(hoje|agora|hj)?/i,
    /hoje\s+[ée]\s+bom\s+(dia|momento)\s+(para|de)\s+(pulverizar|aplicar|adubar)/i,
    /condi[çc][õo]es?\s+(para|de)\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)\s*(hoje)?/i,
    /janela\s+de\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)/i,
    /hora\s+(boa|ideal)\s+(para|de)\s+(pulverizar|aplicar)/i,
    /(pulverizar|aplicar)\s+agora/i,
    /melhor\s+(hora|momento)\s+(para|de|do\s+dia)\s+(aplicar|pulverizar)/i,
    /(t[áa]\s+)?nublado.*posso\s+pulverizar/i,
    /vento\s+(t[áa]\s+)?forte.*rola\s+aplicar/i,
    /vento\s+fraco.*d[áa]\s+(pra|para)\s+entrar/i,
    /chuv(a|er).*posso\s+(aplicar|colher|pulverizar)/i,
    /(orvalho|umidade\s+alta).*posso\s+aplicar/i,
    /calor|quente.*posso\s+aplicar/i,
    /frio.*d[áa]\s+(pra|para)\s+entrar/i,
    /encharcado.*d[áa]\s+(pra|para)\s+ro[çc]ar/i,
    /secar.*d[áa]\s+(pra|para)\s+plantar/i,
    /choveu.*d[áa]\s+(pra|para)\s+entrar/i,
    /rola\s+aplicar/i,
    /consigo\s+ro[çc]ar/i,
    /posso\s+passar\s+veneno/i,
    /d[áa]\s+pra\s+entrar\s+(de\s+)?trator/i,
    /d[áa]\s+pra\s+fazer\s+preparo/i,
    /d[áa]\s+pra\s+passar\s+herbicida/i,
    /o\s+que\s+checar\s+antes/i,
    /quero\s+aplicar\s+hoje/i,
    /rajada\s+de\s+vento.*d[áa]/i,
    /previs[ãa]o\s+de\s+chuva.*posso/i,
    /chuva\s+parar.*posso\s+aplicar/i,
    /temperatura\s+cair.*posso/i,
    /[ée]\s+seguro\s+entrar/i,
  ],
  observation_diagnosis: [
    /folha(s)?\s+(amarela|seca|murcha|manchada|com\s+mancha|enrolando|queimando|bronzeada|com\s+pont|com\s+perfura)/i,
    /folha\s+(com\s+)?(pontinhos?|p[óo]\s+preto|pequenas?\s+perfura)/i,
    /mancha(s)?\s+(na|nas|em|circular)\s+(folha|planta|fruto)/i,
    /murcha(ndo|s)?/i,
    /broto\s+(novo\s+)?t[áa]\s+secando/i,
    /planta\s+(com\s+)?aspecto\s+queimado/i,
    /praga/i, /inseto/i, /[áa]caro/i, /ferrugem/i, /formiga/i, /mofo/i, /fungo/i, /lagarta/i,
    /percevejo/i, /pulgão/i, /trip(e|s)/i, /mosca\s+branca/i, /nematoide/i, /ant?racnose/i,
    /m[íi]ldio/i, /o[íi]dio/i, /podrid[ãa]o/i, /necrose/i, /clorose/i, /queima/i, /broca/i,
    /identific(ar|a[çc][ãa]o|ou)/i, /sintoma/i, /o\s+que\s+[ée]\s+isso/i, /que\s+praga\s+[ée]/i,
    /pode\s+ser\s+(praga|doen[çc]a)/i, /como\s+confirm(o|ar)/i, /como\s+investigar/i, /isso\s+preocupa/i,
    /bicho\s+pequeno\s+na\s+folha/i, /tem\s+uns\s+bicho/i, /teia\s+fina/i, /frutos?\s+caindo/i,
    /inseto\s+voando/i, /formigueiro\s+apareceu/i, /caule\s+com\s+les[ãa]o/i, /raiz\s+exposta/i,
    /plantas?\s+mais\s+baixas/i, /mato\s+subiu\s+r[áa]pido/i, /fruto\s+com\s+mancha/i,
    /eros[ãa]o\s+come[çc]ando/i, /[áa]gua\s+empoçando/i, /press[ãa]o\s+(do\s+)?gotejo\s+caiu/i,
    /(parece|confirmar)\s+defici[êe]ncia/i,
  ],
  cadastro: [
    /cadastr(ar|o)\s+(novo?\s*)?(talh[ãa]o|fazenda|plantio|cultura)/i,
    /criar\s+(novo?\s+)?(talh[ãa]o|fazenda|plantio)/i,
    /adicionar\s+(talh[ãa]o|fazenda|plantio|cultura)/i,
    /registrar?\s+(novo?\s+)?(plantio|safra|cultura)/i,
    /novo\s+(talh[ãa]o|plantio|fazenda)/i,
    /atualiza(r)?\s+[áa]rea\s+(do\s+)?talh[ãa]o/i,
    /muda(r)?\s+variedade/i,
    /vincular\s+agr[ôo]nomo/i,
    /criar\s+talh[ãa]?o\s*\d+/i,
    /cadastrar\s+plantio\s+caf[ée]/i,
    /criar\s+fazenda/i,
    /como\s+(cadastr(ar|o)|cri(ar|o)|adicion(ar|o))\s+(um\s+)?(novo?\s*)?(talh[ãa]o|fazenda|plantio)/i,
    /onde\s+(cadastr(ar|o)|cri(ar|o))\s+(talh[ãa]o|fazenda|plantio)/i,
    /quero\s+(cadastrar|criar|adicionar)\s+(um\s+)?(novo?\s*)?(talh[ãa]o|fazenda|plantio)/i,
  ],
  financeiro: [
    /registrar?\s+(despesa|custo|gasto|receita)/i,
    /lan[çc]ar\s+(despesa|custo|gasto|receita)/i,
    /quanto\s+(gastei|gastar|custou)/i,
    /anotar\s+(gasto|despesa|custo)/i,
    /adicionar\s+(despesa|receita|custo)/i,
    /relat[óo]rio\s+financeiro/i,
    /despesas?\s+(do|da|de)/i,
    /custos?\s+(do|da|de|operacional)/i,
    /registra(r)?\s+despesa\s*:\s*(diesel|pe[çc]as|m[ãa]o\s+de\s+obra)/i,
    /despesa\s+(diesel|combust[íi]vel|pe[çc]as|m[ãa]o\s+de\s+obra)/i,
    /custo\s+(do\s+)?trator/i,
    /receita\s*:\s*venda/i,
    /venda\s+de\s+caf[ée]/i,
    /total\s+de\s+despesas/i,
    /financeiro\s+do\s+m[êe]s/i,
  ],
  weather: [
    /clima/i, /previs[ãa]o/i, /chuva\s+(pra|para|de)\s+h(oje|j)/i, /chov(e|er|eu|a|endo)/i,
    /vai\s+chover/i, /temperatura/i, /umidade/i, /vento/i, /como\s+(est[aá]|vai\s+estar)\s+o\s+tempo/i,
    /calor/i, /frio/i, /geada/i, /seca/i, /alertas?\s+(do\s+)?tempo/i, /previsao\s+chuva/i,
    /tempo\s+hoje/i, /clima\s+(em|de|para|na|no)\s+/i, /vai\s+fazer\s+(sol|frio|calor)/i,
    /previsão\s+(do\s+)?tempo/i, /como\s+está\s+o\s+clima/i,
  ],
};

// ========== STATIC DATA ==========
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
  { value: 'poda', label: 'Poda' },
  { value: 'outros', label: 'Outros' },
];

const OCCURRENCE_CATEGORIES = [
  { value: 'praga', label: 'Praga' },
  { value: 'doenca', label: 'Doença' },
  { value: 'deficiencia', label: 'Deficiência Nutricional' },
  { value: 'dano_climatico', label: 'Dano Climático' },
  { value: 'erva_daninha', label: 'Erva Daninha' },
  { value: 'outro', label: 'Outro' },
];

const SEVERITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const FINANCE_CATEGORIES = [
  { value: 'insumo', label: 'Insumo' },
  { value: 'mao_obra', label: 'Mão de Obra' },
  { value: 'maquinas', label: 'Máquinas' },
  { value: 'energia', label: 'Energia' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'venda', label: 'Venda' },
  { value: 'adubacao', label: 'Adubação' },
  { value: 'outros', label: 'Outros' },
];

// ========== INTERFACES ==========
interface AIRequest {
  workspace_id?: string;
  farm_id?: string;
  plot_id?: string;
  user_message: string;
  photo_url?: string;
  conversation_id?: string;
}

interface ActionFlowField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea';
  value?: unknown;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
}

interface ActionFlowData {
  id: string;
  title: string;
  entity: string;
  fields: ActionFlowField[];
  confirm_label: string;
  cancel_label: string;
  on_confirm: {
    endpoint: string;
    method: 'POST';
    body_map: Record<string, string>;
  };
}

interface AIAction {
  type: string;
  label?: string;
  payload?: Record<string, unknown>;
}

interface AIDebugInfo {
  limit: number;
  used: number;
  remaining: number;
  plan_used: 'free' | 'premium';
  limit_source: 'campaign' | 'workspace' | 'global' | 'default';
  bypass: boolean;
  bypass_active: boolean; // Clearer indicator that quota is being bypassed
  is_superadmin: boolean;
  ai_admin_bypass_flag: boolean; // Whether the flag itself is true
}

interface AIResponse {
  assistant_text: string;
  actions: AIAction[];
  action_flow_data?: ActionFlowData;
  flags: {
    decision_route?: string;
    sources_used?: string[];
    show_escalate_to_agronomist?: boolean;
    blocked_reason?: string;
  };
  safety?: {
    blocked: boolean;
    reason?: string;
    suggest_escalate: boolean;
  };
  debug?: AIDebugInfo;
}

// ========== POP LOOKUP CACHE AND HELPER ==========
// Cache for POP lookups within the same request
const popCache = new Map<string, { id: string; title: string } | null>();

async function getPopBySlug(
  supabase: any,
  slug: string
): Promise<{ id: string; title: string } | null> {
  // Check cache first
  if (popCache.has(slug)) {
    return popCache.get(slug) || null;
  }
  
  try {
    const { data, error } = await supabase
      .from('pops')
      .select('id, title')
      .eq('slug', slug)
      .eq('is_active', true)
      .is('workspace_id', null)
      .single();
    
    if (error || !data) {
      popCache.set(slug, null);
      return null;
    }
    
    // Cast data to expected type
    const popData = data as { id: string; title: string };
    const result = { id: popData.id, title: popData.title };
    popCache.set(slug, result);
    return result;
  } catch {
    popCache.set(slug, null);
    return null;
  }
}

// ========== POP SUGGESTIONS BY INTENT ==========
interface PopSuggestion {
  slug: string;
  fallbackTitle: string;
}

function getPopSuggestionsForHighRisk(message: string): PopSuggestion[] {
  const suggestions: PopSuggestion[] = [
    { slug: 'checklist-pre-aplicacao-condicoes', fallbackTitle: 'Checklist pré-aplicação' },
    { slug: 'checklist-seguranca-epi', fallbackTitle: 'Checklist de segurança — EPI' },
  ];
  
  // Check for rain/wet conditions
  const rainPatterns = /chuv[ao]|choveu|encharcad[ao]|atolar|po[çc]a|molhad[ao]|[áa]gua\s+parada/i;
  if (rainPatterns.test(message)) {
    suggestions.push({ slug: 'checklist-pos-chuva', fallbackTitle: 'Checklist pós-chuva' });
  }
  
  return suggestions;
}

function getPopSuggestionsForInspection(message: string): PopSuggestion[] {
  const suggestions: PopSuggestion[] = [];
  
  // Check for pest-related terms
  const pestPatterns = /praga|inseto|lagarta|[áa]caro|formiga|broca|teia|melada|percevejo|pulg[ãa]o|trip[es]?|mosca\s+branca|bicho/i;
  // Check for disease-related terms
  const diseasePatterns = /mancha|ferrugem|mofo|p[óo]\s+(branco|preto)|necrose|queda\s+de\s+(folha|fruto)|podrid[ãa]o|fungo|m[íi]ldio|o[íi]dio|antracnose|doen[çc]a/i;
  
  if (pestPatterns.test(message)) {
    suggestions.push({ slug: 'checklist-inspecao-pragas', fallbackTitle: 'Checklist de inspeção — pragas' });
    suggestions.push({ slug: 'checklist-registro-atividades', fallbackTitle: 'Padrão de registro — atividades' });
  }
  
  if (diseasePatterns.test(message)) {
    suggestions.push({ slug: 'checklist-inspecao-doencas', fallbackTitle: 'Checklist de inspeção — doenças' });
    if (!pestPatterns.test(message)) {
      suggestions.push({ slug: 'checklist-registro-atividades', fallbackTitle: 'Padrão de registro — atividades' });
    }
  }
  
  // Default if no specific match
  if (suggestions.length === 0) {
    suggestions.push({ slug: 'checklist-inspecao-pragas', fallbackTitle: 'Checklist de inspeção — pragas' });
    suggestions.push({ slug: 'checklist-inspecao-doencas', fallbackTitle: 'Checklist de inspeção — doenças' });
    suggestions.push({ slug: 'checklist-registro-atividades', fallbackTitle: 'Padrão de registro — atividades' });
  }
  
  return suggestions;
}

function getPopSuggestionsForIrrigation(message: string): PopSuggestion[] {
  return [
    { slug: 'checklist-irrigacao-verificacao', fallbackTitle: 'Checklist de irrigação — verificação' },
    { slug: 'checklist-manutencao-irrigacao', fallbackTitle: 'Checklist manutenção — irrigação' },
  ];
}

function getPopSuggestionsForPulverizador(message: string): PopSuggestion[] {
  return [
    { slug: 'checklist-manutencao-pulverizador', fallbackTitle: 'Checklist manutenção — pulverizador' },
    { slug: 'checklist-seguranca-epi', fallbackTitle: 'Checklist de segurança — EPI' },
  ];
}

function getPopSuggestionsForPreColheitaCafe(message: string): PopSuggestion[] {
  return [
    { slug: 'checklist-pre-colheita-cafe', fallbackTitle: 'Checklist pré-colheita — café' },
    { slug: 'checklist-seguranca-epi', fallbackTitle: 'Checklist de segurança — EPI' },
  ];
}

async function buildPopActions(
  supabase: any,
  suggestions: PopSuggestion[]
): Promise<AIAction[]> {
  const actions: AIAction[] = [];
  
  for (const suggestion of suggestions) {
    const pop = await getPopBySlug(supabase, suggestion.slug);
    if (pop) {
      actions.push({
        type: 'open_pop',
        label: `📋 ${pop.title}`,
        payload: { pop_id: pop.id },
      });
    }
  }
  
  return actions;
}

// Detect specific sub-intents for POP suggestions
function detectIrrigationMaintenance(message: string): boolean {
  return /press[ãa]o\s+(caiu|baixa)|vazamento|entupimento|bomba|aspersor|gotejo|sangria|mangueira/i.test(message);
}

function detectPulverizadorMaintenance(message: string): boolean {
  return /bico\s+entup|vazamento\s+(no\s+)?pulverizador|calibra[çc][ãa]o|lavar\s+pulverizador|pulverizador\s+(com|precisa)/i.test(message);
}

function detectPreColheitaCafe(message: string): boolean {
  return /colheita\s+(de\s+)?caf[ée]|terreiro|secagem|sacaria|caf[ée]\s+(pronto|maduro|cereja)|pre-colheita|p[óo]s-colheita/i.test(message);
}

// getTodayBRT is now imported from _shared/date.ts

function parseNumericFlag(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!isNaN(parsed)) return parsed;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('value' in obj) {
      const parsed = Number(obj.value);
      if (!isNaN(parsed)) return parsed;
    }
  }
  return fallback;
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

type Intent = 'register_activity' | 'create_task' | 'open_screen' | 'high_risk_today' | 
              'observation_diagnosis' | 'cadastro' | 'financeiro' | 'weather' | 'general';

function classifyIntent(message: string): Intent {
  for (const pattern of INTENT_PATTERNS.high_risk_today) {
    if (pattern.test(message)) return 'high_risk_today';
  }
  
  const priorities: (keyof typeof INTENT_PATTERNS)[] = [
    'register_activity', 'create_task', 'observation_diagnosis', 
    'financeiro', 'cadastro', 'open_screen', 'weather'
  ];
  
  for (const intent of priorities) {
    const patterns = INTENT_PATTERNS[intent];
    for (const pattern of patterns) {
      if (pattern.test(message)) return intent;
    }
  }
  
  return 'general';
}

function extractActivityType(message: string): string | null {
  const patterns = [
    { pattern: /limp[ea]?[sz]?[ao]?/i, tipo: 'limpeza' },
    { pattern: /ro[çc]a(da|gem)?/i, tipo: 'rocada' },
    { pattern: /aduba[çc][ãa]o|adubar|adubamos|adubei|calc[áa]rio/i, tipo: 'adubacao' },
    { pattern: /pulveriza[çc][ãa]o|pulverizar/i, tipo: 'pulverizacao' },
    { pattern: /colheita|colher|colhemos/i, tipo: 'colheita' },
    { pattern: /manuten[çc][ãa]o|consert(ei|amos)|troca\s+(de\s+)?(bico|[óo]leo|rolamento)|revis[ãa]o|lubrifica[çc][ãa]o|lavagem/i, tipo: 'manutencao' },
    { pattern: /capina|capinei/i, tipo: 'capina' },
    { pattern: /irriga[çc][ãa]o|irrigar|irriguei|gotejo|aspersor|sangria/i, tipo: 'irrigacao' },
    { pattern: /plantio|plantar|replantio/i, tipo: 'plantio' },
    { pattern: /preparo\s+(de\s+)?solo/i, tipo: 'preparo_solo' },
    { pattern: /poda|podar|desbrota|amarr[açã][ãa]o/i, tipo: 'poda' },
    { pattern: /carreiro/i, tipo: 'outros' },
    { pattern: /coleta\s+(de\s+)?(amostra|solo|folha)/i, tipo: 'outros' },
    { pattern: /controle\s+(de\s+)?formiga/i, tipo: 'outros' },
    { pattern: /cobertura\s+morta/i, tipo: 'outros' },
    { pattern: /armadilha/i, tipo: 'outros' },
  ];
  
  for (const { pattern, tipo } of patterns) {
    if (pattern.test(message)) return tipo;
  }
  return null;
}

function extractScreenRoute(message: string): { route: string; label: string } | null {
  const patterns = [
    { pattern: /clima|tempo|previs[ãa]o|alertas?\s+(do\s+)?tempo/i, route: '/clima', label: 'Clima' },
    { pattern: /relat[óo]rio|relat[óo]rios/i, route: '/relatorios', label: 'Relatórios' },
    { pattern: /pre[çc]os?/i, route: '/precos', label: 'Preços' },
    { pattern: /financeiro|finan[çc]as?|despesas?|receita/i, route: '/financeiro', label: 'Financeiro' },
    { pattern: /talh[õo]es?/i, route: '/talhoes', label: 'Talhões' },
    { pattern: /fazendas?/i, route: '/fazendas', label: 'Fazendas' },
    { pattern: /dashboard|in[íi]cio|painel\s+geral/i, route: '/', label: 'Dashboard' },
    { pattern: /atividades?/i, route: '/talhoes', label: 'Atividades' },
    { pattern: /plantios?/i, route: '/talhoes', label: 'Plantios' },
    { pattern: /tarefas?|pendentes?/i, route: '/talhoes', label: 'Tarefas' },
    { pattern: /ocorr[êe]ncias?/i, route: '/talhoes', label: 'Ocorrências' },
    { pattern: /calend[áa]rio/i, route: '/talhoes', label: 'Calendário' },
    { pattern: /hist[óo]rico/i, route: '/relatorios', label: 'Histórico' },
    { pattern: /custos?/i, route: '/financeiro', label: 'Custos' },
    { pattern: /consumo\s+ia/i, route: '/configuracoes', label: 'Consumo IA' },
    { pattern: /admin/i, route: '/admin', label: 'Admin' },
    { pattern: /integra[çc][õo]es/i, route: '/configuracoes', label: 'Integrações' },
    { pattern: /auditoria/i, route: '/admin/auditoria', label: 'Auditoria' },
    { pattern: /usu[áa]rios/i, route: '/org/users', label: 'Usuários' },
    { pattern: /agr[ôo]nomo/i, route: '/org/agronomists', label: 'Agrônomos' },
    { pattern: /painel\s+b2b/i, route: '/org', label: 'Painel B2B' },
  ];
  
  for (const { pattern, route, label } of patterns) {
    if (pattern.test(message)) return { route, label };
  }
  return null;
}

function extractOccurrenceCategory(message: string): string | null {
  const patterns = [
    { pattern: /praga|inseto|lagarta|percevejo|pulgão|trip|mosca|bicho|formiga|[áa]caro|broca/i, category: 'praga' },
    { pattern: /doen[çc]a|ferrugem|mofo|fungo|ant?racnose|m[íi]ldio|o[íi]dio|podrid[ãa]o/i, category: 'doenca' },
    { pattern: /defici[êe]ncia|clorose|amarela|nutriente|carência/i, category: 'deficiencia' },
    { pattern: /clima|geada|seca|granizo|vento\s+forte|queima\s+solar/i, category: 'dano_climatico' },
    { pattern: /erva|daninha|mato|invas(or|ão)/i, category: 'erva_daninha' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) return category;
  }
  return null;
}

function extractFinanceType(message: string): 'custo' | 'receita' {
  if (/receita|venda|ganho|entrada/i.test(message)) return 'receita';
  return 'custo';
}

function extractFinanceCategory(message: string): string {
  const patterns = [
    { pattern: /diesel|combust[íi]vel|gasolina/i, category: 'maquinas' },
    { pattern: /m[ãa]o\s+de\s+obra|trabalhador|di[áa]ria/i, category: 'mao_obra' },
    { pattern: /pe[çc]as?|conserto|reparo/i, category: 'maquinas' },
    { pattern: /adubo|fertilizante/i, category: 'adubacao' },
    { pattern: /insumo|semente|defensivo/i, category: 'insumo' },
    { pattern: /energia|luz|eletricidade/i, category: 'energia' },
    { pattern: /transporte|frete/i, category: 'transporte' },
    { pattern: /venda|caf[ée]|gr[ãa]o/i, category: 'venda' },
    { pattern: /trator|m[áa]quina/i, category: 'maquinas' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) return category;
  }
  return 'outros';
}

// deno-lint-ignore no-explicit-any
async function getUserFarms(supabase: any, userId: string): Promise<Array<{ id: string; nome: string }>> {
  const { data } = await supabase
    .from('farms')
    .select('id, nome')
    .eq('user_id', userId)
    .order('nome');
  return data || [];
}

// deno-lint-ignore no-explicit-any
async function getFarmPlots(supabase: any, farmId: string): Promise<Array<{ id: string; nome: string }>> {
  const { data } = await supabase
    .from('plots')
    .select('id, nome')
    .eq('farm_id', farmId)
    .order('nome');
  return data || [];
}

// deno-lint-ignore no-explicit-any
async function getWorkspaceId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  return data?.workspace_id || null;
}

// deno-lint-ignore no-explicit-any
async function checkIsSuperadmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_system_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'superadmin')
    .maybeSingle();
  return !!data;
}

interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  used: number;
  bypass: boolean;
  plan_used: 'free' | 'premium';
  limit_source: 'campaign' | 'workspace' | 'global' | 'default';
  is_superadmin: boolean;
  ai_admin_bypass_flag: boolean; // Raw flag value
}

// deno-lint-ignore no-explicit-any
async function checkQuotaWithDebug(supabase: any, workspaceId: string, userId: string): Promise<QuotaResult> {
  const today = getTodayBRT();
  
  // Check if user is superadmin
  const isSuperadmin = await checkIsSuperadmin(supabase, userId);
  
  // Get workspace plan
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', workspaceId)
    .single();
  
  const plan = workspace?.plan || 'free';
  const isPremiumPlan = plan === 'premium' || plan === 'enterprise';
  const planUsed: 'free' | 'premium' = isPremiumPlan ? 'premium' : 'free';
  
  // Default quotas
  const defaultQuotas = { free: 10, premium: 150 };
  let limit = isPremiumPlan ? defaultQuotas.premium : defaultQuotas.free;
  let limitSource: 'campaign' | 'workspace' | 'global' | 'default' = 'default';
  let bypass = false;
  
  // 1. Check global flags
  const { data: globalFlags } = await supabase
    .from('feature_flags_global')
    .select('key, value_json');
  
  let aiAdminBypass = false;
  for (const f of globalFlags || []) {
    if (f.key === 'ai_daily_quota_free' && !isPremiumPlan) {
      const parsed = parseNumericFlag(f.value_json, defaultQuotas.free);
      if (parsed > 0) {
        limit = parsed;
        limitSource = 'global';
      }
    }
    if (f.key === 'ai_daily_quota_premium' && isPremiumPlan) {
      const parsed = parseNumericFlag(f.value_json, defaultQuotas.premium);
      if (parsed > 0) {
        limit = parsed;
        limitSource = 'global';
      }
    }
    if (f.key === 'ai_admin_bypass') {
      // Normalize bypass flag - support multiple formats
      const val = f.value_json;
      aiAdminBypass = val === true || 
                      val === 'true' ||
                      (typeof val === 'object' && val !== null && (
                        (val as Record<string, unknown>)?.enabled === true ||
                        (val as Record<string, unknown>)?.is_enabled === true ||
                        (val as Record<string, unknown>)?.value === true
                      ));
    }
  }
  
  // 2. Check workspace flags (can override)
  const { data: wsFlags } = await supabase
    .from('feature_flags_workspace')
    .select('key, value_json')
    .eq('workspace_id', workspaceId);
  
  for (const f of wsFlags || []) {
    if (f.key === 'ai_daily_quota') {
      const parsed = parseNumericFlag(f.value_json, 0);
      if (parsed > 0) {
        limit = parsed;
        limitSource = 'workspace';
      }
    }
    if (f.key === 'ai_admin_bypass') {
      // Normalize bypass flag - support multiple formats (workspace can override global)
      const val = f.value_json;
      aiAdminBypass = val === true || 
                      val === 'true' ||
                      (typeof val === 'object' && val !== null && (
                        (val as Record<string, unknown>)?.enabled === true ||
                        (val as Record<string, unknown>)?.is_enabled === true ||
                        (val as Record<string, unknown>)?.value === true
                      ));
    }
  }
  
  // 3. Check campaigns (highest priority)
  const now = new Date().toISOString();
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('rule_json, payload_json')
    .eq('is_enabled', true)
    .lte('start_at', now)
    .or(`end_at.is.null,end_at.gte.${now}`);
  
  for (const campaign of campaigns || []) {
    const rules = campaign.rule_json as Record<string, unknown> | null;
    const payload = campaign.payload_json as Record<string, unknown> | null;
    
    if (rules) {
      const targetWorkspaces = rules.workspaces as string[] | undefined;
      if (targetWorkspaces && !targetWorkspaces.includes(workspaceId)) {
        continue;
      }
    }
    
    if (payload && payload.ai_daily_quota !== undefined) {
      const parsed = parseNumericFlag(payload.ai_daily_quota, 0);
      if (parsed > 0) {
        limit = parsed;
        limitSource = 'campaign';
      }
    }
  }
  
  // 4. Check bypass (superadmin + ai_admin_bypass flag)
  if (isSuperadmin && aiAdminBypass) {
    bypass = true;
    console.log('[ai-ask] Quota bypass active for superadmin');
  }
  
  // 5. Get usage (count ALL sources together, not per-source)
  const { data: usage } = await supabase
    .from('ai_usage_log')
    .select('requests')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today);
  
  const used = (usage || []).reduce((sum: number, r: { requests: number }) => sum + (r.requests || 0), 0);
  const remaining = bypass ? 999 : Math.max(0, limit - used);
  
  return {
    allowed: bypass || used < limit,
    remaining,
    limit,
    used,
    bypass,
    plan_used: planUsed,
    limit_source: limitSource,
    is_superadmin: isSuperadmin,
    ai_admin_bypass_flag: aiAdminBypass,
  };
}

// Increment usage ONCE per question (not per provider)
// deno-lint-ignore no-explicit-any
async function incrementUsage(supabase: any, workspaceId: string, userId: string, bypass: boolean): Promise<void> {
  // If bypass is active, we still want to track for auditing but not block
  // We'll still increment to have an accurate count
  const today = getTodayBRT();
  const source = AI_USAGE_SOURCE; // Use shared constant for consistency
  
  const { data: existing } = await supabase
    .from('ai_usage_log')
    .select('id, requests')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today)
    .eq('source', source)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('ai_usage_log')
      .update({ requests: (existing.requests || 0) + 1 })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_usage_log').insert({
      workspace_id: workspaceId,
      user_id: userId,
      day: today,
      source,
      requests: 1,
    });
  }
  
  console.log('[ai-ask] Usage incremented. Bypass:', bypass);
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
    const { data: conv } = await supabase
      .from('ai_conversations')
      .insert({ user_id: userId, workspace_id: workspaceId })
      .select('id')
      .single();
    convId = conv?.id;
  }

  if (convId) {
    await supabase.from('ai_messages').insert([
      { conversation_id: convId, role: 'user', content: userMessage },
      { conversation_id: convId, role: 'assistant', content: assistantMessage, meta_json: metaJson },
    ]);
  }

  return convId || '';
}

// ========== MAIN HANDLER ==========
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

    console.log('[ai-ask] Request:', { userId: user.id, intent: 'pending', messageLen: user_message.length });

    // 1. Check guardrails
    const blockedReason = checkBlockedContent(user_message);
    if (blockedReason) {
      const response: AIResponse = {
        assistant_text: `⚠️ **Não posso fornecer prescrição técnica sobre "${blockedReason}".**\n\nPor razões de segurança, informações sobre doses, misturas ou produtos específicos devem ser fornecidas por um agrônomo.\n\n**Próximos passos:**\n✅ Consulte o agrônomo responsável\n✅ Registre uma ocorrência para acompanhamento`,
        actions: [
          { type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' },
        ],
        flags: { decision_route: 'blocked_guardrail', blocked_reason: blockedReason },
        safety: { blocked: true, reason: blockedReason, suggest_escalate: true },
      };
      return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Check quota with full debug info
    const effectiveWorkspaceId = workspace_id || await getWorkspaceId(supabase, user.id);
    let quotaInfo: QuotaResult | null = null;
    
    if (effectiveWorkspaceId) {
      quotaInfo = await checkQuotaWithDebug(supabase, effectiveWorkspaceId, user.id);
      
      if (!quotaInfo.allowed) {
        const debugInfo: AIDebugInfo | undefined = quotaInfo.is_superadmin ? {
          limit: quotaInfo.limit,
          used: quotaInfo.used,
          remaining: quotaInfo.remaining,
          plan_used: quotaInfo.plan_used,
          limit_source: quotaInfo.limit_source,
          bypass: quotaInfo.bypass,
          bypass_active: quotaInfo.bypass,
          is_superadmin: quotaInfo.is_superadmin,
          ai_admin_bypass_flag: quotaInfo.ai_admin_bypass_flag,
        } : undefined;
        
        const response: AIResponse = {
          assistant_text: `📊 **Limite diário atingido.**\n\nVocê usou ${quotaInfo.used}/${quotaInfo.limit} consultas hoje. Seu limite será renovado amanhã às 00:00.\n\nEnquanto isso:\n- Consulte nossos conteúdos técnicos\n- Envie sua dúvida para um agrônomo`,
          actions: [
            { type: 'open_screen', label: 'Ver Planos', payload: { route: '/configuracoes' } },
            { type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' },
          ],
          flags: { decision_route: 'quota_exceeded' },
          safety: { blocked: false, suggest_escalate: true },
          debug: debugInfo,
        };
        return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 3. Classify intent (deterministic router)
    const intent = classifyIntent(user_message);
    console.log('[ai-ask] Intent:', intent);

    const today = getTodayBRT();
    let response: AIResponse;

    // ========== INTENT HANDLERS ==========

    // A) REGISTER_ACTIVITY
    if (intent === 'register_activity') {
      const activityType = extractActivityType(user_message);
      const tipoLabel = ACTIVITY_TYPES.find(t => t.value === activityType)?.label || 'atividade';
      
      let plots: Array<{ id: string; nome: string }> = [];
      if (farm_id) {
        plots = await getFarmPlots(supabase, farm_id);
      }

      response = {
        assistant_text: `📋 **Vamos registrar a ${tipoLabel}!**\n\nConfira os dados abaixo e confirme para salvar.`,
        actions: [],
        action_flow_data: {
          id: `activity_${Date.now()}`,
          title: 'Registrar Atividade',
          entity: 'activity',
          fields: [
            {
              key: 'plot_id',
              label: 'Talhão',
              type: 'select',
              value: plot_id || '',
              options: plots.length > 0 ? plots.map(p => ({ value: p.id, label: p.nome })) : [],
              required: true,
            },
            {
              key: 'tipo',
              label: 'Tipo de Atividade',
              type: 'select',
              value: activityType || '',
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
              value: '',
            },
            {
              key: 'observacoes',
              label: 'Observações',
              type: 'textarea',
              value: '',
            },
          ],
          confirm_label: 'Salvar Atividade',
          cancel_label: 'Cancelar',
          on_confirm: {
            endpoint: '/functions/v1/activities-create',
            method: 'POST',
            body_map: { plot_id: 'plot_id', tipo: 'tipo', data: 'data', descricao: 'descricao', observacoes: 'observacoes' },
          },
        },
        flags: { decision_route: 'register_activity' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // B) CREATE_TASK
    else if (intent === 'create_task') {
      const farms = await getUserFarms(supabase, user.id);
      let plots: Array<{ id: string; nome: string }> = [];
      if (farm_id) {
        plots = await getFarmPlots(supabase, farm_id);
      }

      response = {
        assistant_text: `📝 **Vamos criar uma tarefa!**\n\nPreencha os detalhes abaixo.`,
        actions: [],
        action_flow_data: {
          id: `task_${Date.now()}`,
          title: 'Criar Tarefa',
          entity: 'task',
          fields: [
            {
              key: 'title',
              label: 'Título da Tarefa',
              type: 'text',
              value: '',
              required: true,
            },
            {
              key: 'due_date',
              label: 'Data de Vencimento',
              type: 'date',
              value: today,
            },
            {
              key: 'priority',
              label: 'Prioridade',
              type: 'select',
              value: 'medium',
              options: PRIORITY_OPTIONS,
            },
            {
              key: 'farm_id',
              label: 'Fazenda',
              type: 'select',
              value: farm_id || '',
              options: farms.map(f => ({ value: f.id, label: f.nome })),
            },
            {
              key: 'talhao_id',
              label: 'Talhão',
              type: 'select',
              value: plot_id || '',
              options: plots.map(p => ({ value: p.id, label: p.nome })),
            },
            {
              key: 'notes',
              label: 'Observações',
              type: 'textarea',
              value: '',
            },
          ],
          confirm_label: 'Criar Tarefa',
          cancel_label: 'Cancelar',
          on_confirm: {
            endpoint: '/functions/v1/tasks-create',
            method: 'POST',
            body_map: { workspace_id: 'workspace_id', title: 'title', due_date: 'due_date', priority: 'priority', farm_id: 'farm_id', talhao_id: 'talhao_id', notes: 'notes' },
          },
        },
        flags: { decision_route: 'create_task' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // C) OPEN_SCREEN
    else if (intent === 'open_screen') {
      const screen = extractScreenRoute(user_message);
      const route = screen?.route || '/';
      const label = screen?.label || 'Tela';

      response = {
        assistant_text: `👉 Abrindo **${label}**. Clique no botão abaixo.`,
        actions: [
          { type: 'open_screen', label: `Abrir ${label}`, payload: { route } },
        ],
        flags: { decision_route: 'open_screen' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // D) HIGH_RISK_TODAY - NUNCA sim/não
    else if (intent === 'high_risk_today') {
      // Get dynamic POP suggestions based on message content
      const popSuggestions = getPopSuggestionsForHighRisk(user_message);
      const popActions = await buildPopActions(supabase, popSuggestions);
      
      response = {
        assistant_text: `⚠️ **Checklist de Segurança para Aplicação**\n\nAntes de aplicar, verifique:\n\n☐ **Chuva**: Sem previsão de chuva nas próximas 6-12h\n☐ **Vento**: Rajadas abaixo de 10 km/h\n☐ **Umidade**: Entre 60-90% (evitar inversão térmica)\n☐ **Temperatura**: Abaixo de 30°C\n☐ **Orvalho**: Aguardar secar se houver\n☐ **Solo**: Verificar se o acesso está liberado\n☐ **Equipamento**: Calibrado e em bom estado\n\n📊 **Consulte o módulo Clima** para ver as condições atuais e a janela de aplicação recomendada.\n\n📋 **Veja os POPs** para os checklists detalhados.\n\n👨‍🌾 **Importante**: Consulte sempre o agrônomo RT para decisões de aplicação.`,
        actions: [
          { type: 'open_screen', label: '☁️ Ver Clima', payload: { route: '/clima' } },
          ...popActions,
          { type: 'escalate_to_agronomist', label: 'Consultar Agrônomo' },
        ],
        flags: { decision_route: 'high_risk_today' },
        safety: { blocked: false, suggest_escalate: true },
      };
    }

    // E) OBSERVATION_DIAGNOSIS
    else if (intent === 'observation_diagnosis') {
      const category = extractOccurrenceCategory(user_message);
      const categoryLabel = OCCURRENCE_CATEGORIES.find(c => c.value === category)?.label || 'problema';
      
      let plots: Array<{ id: string; nome: string }> = [];
      if (farm_id) {
        plots = await getFarmPlots(supabase, farm_id);
      }

      // Get dynamic POP suggestions based on message content
      const popSuggestions = getPopSuggestionsForInspection(user_message);
      const popActions = await buildPopActions(supabase, popSuggestions);

      response = {
        assistant_text: `🔍 **Vamos investigar!**\n\nPara ajudar na identificação, siga este checklist:\n\n☐ **Localização**: Onde está o problema? (talhão/linha)\n☐ **Extensão**: Pontual, em reboleira ou espalhado?\n☐ **Fotos**: Tire fotos de perto e de longe\n☐ **Condições**: Choveu recentemente? Área úmida?\n\n📋 **Veja os POPs de inspeção** para mais detalhes.\n\n⚠️ Para diagnóstico preciso e tratamento, consulte o agrônomo.`,
        actions: [
          ...popActions,
          { type: 'escalate_to_agronomist', label: 'Enviar ao Agrônomo' },
        ],
        action_flow_data: {
          id: `occurrence_${Date.now()}`,
          title: 'Registrar Ocorrência',
          entity: 'occurrence',
          fields: [
            {
              key: 'talhao_id',
              label: 'Talhão',
              type: 'select',
              value: plot_id || '',
              options: plots.map(p => ({ value: p.id, label: p.nome })),
              required: true,
            },
            {
              key: 'category',
              label: 'Categoria',
              type: 'select',
              value: category || '',
              options: OCCURRENCE_CATEGORIES,
              required: true,
            },
            {
              key: 'severity',
              label: 'Severidade',
              type: 'select',
              value: 'media',
              options: SEVERITY_OPTIONS,
            },
            {
              key: 'description',
              label: 'Descrição',
              type: 'textarea',
              value: '',
            },
          ],
          confirm_label: 'Registrar Ocorrência',
          cancel_label: 'Cancelar',
          on_confirm: {
            endpoint: '/functions/v1/occurrences-create',
            method: 'POST',
            body_map: { workspace_id: 'workspace_id', farm_id: 'farm_id', talhao_id: 'talhao_id', category: 'category', severity: 'severity', description: 'description' },
          },
        },
        flags: { decision_route: 'observation_diagnosis' },
        safety: { blocked: false, suggest_escalate: true },
      };
    }

    // F) CADASTRO - Resposta específica por tipo
    else if (intent === 'cadastro') {
      // Detect what user wants to create
      const wantsTalhao = /talh[ãa]o/i.test(user_message);
      const wantsFazenda = /fazenda/i.test(user_message);
      const wantsPlantio = /plantio|safra|cultura/i.test(user_message);
      
      let assistantText = '';
      const actions: AIAction[] = [];
      
      if (wantsTalhao) {
        assistantText = `📍 **Cadastrar Talhão**\n\nVá em **Talhões & Plantio → Novo Talhão** para criar um novo talhão.\n\nClique no botão abaixo para acessar diretamente.`;
        actions.push({ type: 'open_screen', label: '📍 Abrir Talhões & Plantio', payload: { route: '/talhoes' } });
      } else if (wantsFazenda) {
        assistantText = `🌾 **Cadastrar Fazenda**\n\nVá em **Fazendas → Nova Fazenda** para criar uma nova fazenda.\n\nClique no botão abaixo para acessar diretamente.`;
        actions.push({ type: 'open_screen', label: '🌾 Abrir Fazendas', payload: { route: '/fazendas' } });
      } else if (wantsPlantio) {
        assistantText = `🌱 **Cadastrar Plantio**\n\nVá em **Talhões & Plantio → Selecione um Talhão → Novo Plantio** para registrar um novo plantio.\n\nClique no botão abaixo para acessar diretamente.`;
        actions.push({ type: 'open_screen', label: '📍 Abrir Talhões & Plantio', payload: { route: '/talhoes' } });
      } else {
        // Generic cadastro
        assistantText = `📝 **Cadastros**\n\nPara cadastrar ou editar:\n\n- **Fazendas**: Vá em Fazendas → Nova Fazenda\n- **Talhões**: Vá em Talhões & Plantio → Novo Talhão\n- **Plantios**: Vá em Talhões & Plantio → Selecione → Novo Plantio\n\nClique abaixo para acessar a área desejada.`;
        actions.push({ type: 'open_screen', label: '🌾 Fazendas', payload: { route: '/fazendas' } });
        actions.push({ type: 'open_screen', label: '📍 Talhões & Plantio', payload: { route: '/talhoes' } });
      }

      response = {
        assistant_text: assistantText,
        actions,
        flags: { decision_route: 'cadastro' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // G) FINANCEIRO
    else if (intent === 'financeiro') {
      const farms = await getUserFarms(supabase, user.id);
      const financeType = extractFinanceType(user_message);
      const financeCategory = extractFinanceCategory(user_message);

      response = {
        assistant_text: `💰 **Vamos registrar no financeiro!**\n\nPreencha os dados abaixo.`,
        actions: [],
        action_flow_data: {
          id: `transaction_${Date.now()}`,
          title: financeType === 'receita' ? 'Registrar Receita' : 'Registrar Despesa',
          entity: 'transaction',
          fields: [
            {
              key: 'farm_id',
              label: 'Fazenda',
              type: 'select',
              value: farm_id || '',
              options: farms.map(f => ({ value: f.id, label: f.nome })),
              required: true,
            },
            {
              key: 'tipo',
              label: 'Tipo',
              type: 'select',
              value: financeType,
              options: [
                { value: 'custo', label: 'Despesa/Custo' },
                { value: 'receita', label: 'Receita' },
              ],
              required: true,
            },
            {
              key: 'categoria',
              label: 'Categoria',
              type: 'select',
              value: financeCategory,
              options: FINANCE_CATEGORIES,
              required: true,
            },
            {
              key: 'valor_brl',
              label: 'Valor (R$)',
              type: 'number',
              value: '',
              required: true,
            },
            {
              key: 'descricao',
              label: 'Descrição',
              type: 'text',
              value: '',
              required: true,
            },
            {
              key: 'data',
              label: 'Data',
              type: 'date',
              value: today,
              required: true,
            },
          ],
          confirm_label: 'Salvar',
          cancel_label: 'Cancelar',
          on_confirm: {
            endpoint: '/functions/v1/transactions-create',
            method: 'POST',
            body_map: { farm_id: 'farm_id', tipo: 'tipo', categoria: 'categoria', valor_brl: 'valor_brl', descricao: 'descricao', data: 'data' },
          },
        },
        flags: { decision_route: 'financeiro' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // H) WEATHER - Fallback inteligente baseado em fazenda selecionada
    else if (intent === 'weather') {
      // Check if user has a farm selected
      const hasFarm = !!farm_id;
      
      if (hasFarm) {
        response = {
          assistant_text: `🌤️ **Consulte o módulo Clima!**\n\nO módulo Clima oferece:\n📊 Previsão detalhada para sua fazenda\n🌧️ Alertas de chuva\n📈 Histórico climático\n🚜 Janelas de pulverização\n\nClique abaixo para acessar.`,
          actions: [
            { type: 'open_screen', label: '☁️ Ver Clima', payload: { route: '/clima' } },
          ],
          flags: { decision_route: 'weather' },
          safety: { blocked: false, suggest_escalate: false },
        };
      } else {
        // No farm selected - guide user to select/create one
        response = {
          assistant_text: `🌤️ **Clima por Fazenda**\n\nEu mostro o clima pelo Bom Campo (por fazenda). Selecione uma fazenda para ver a previsão e alertas.\n\n**Como funciona:**\n1. Selecione ou crie uma fazenda\n2. O clima será baseado na localização da fazenda\n\nClique abaixo para selecionar ou criar uma fazenda.`,
          actions: [
            { type: 'open_screen', label: '🌾 Selecionar/Criar Fazenda', payload: { route: '/fazendas' } },
          ],
          flags: { decision_route: 'weather_no_farm' },
          safety: { blocked: false, suggest_escalate: false },
        };
      }
    }

    // I) GENERAL - Fallback com IA
    else {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) throw new Error("No API key");

        const systemPrompt = `Você é o assistente agronômico do BomCampo. Responda de forma curta e objetiva.
REGRAS: Nunca prescreva doses, misturas, ou produtos. Para tratamentos, oriente "consulte o agrônomo RT".
Use emojis. Termine com próximos passos.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-5-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: user_message },
            ],
            max_completion_tokens: 512,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const text = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua pergunta.";
          
          response = {
            assistant_text: text,
            actions: [
              { type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' },
            ],
            flags: { decision_route: 'general_ai', sources_used: ['openai/gpt-5-mini'] },
            safety: { blocked: false, suggest_escalate: true },
          };
        } else {
          throw new Error("AI call failed");
        }
      } catch (error) {
        console.error('[ai-ask] AI fallback error:', error);
        response = {
          assistant_text: `🤔 Não consegui entender completamente sua pergunta.\n\n**Posso ajudar com:**\n- 📋 Registrar atividades\n- 📝 Criar tarefas\n- 🔍 Identificar pragas/doenças\n- ☁️ Consultar clima\n- 💰 Lançar financeiro\n\n👨‍🌾 Ou envie sua dúvida para um agrônomo.`,
          actions: [
            { type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' },
          ],
          flags: { decision_route: 'fallback' },
          safety: { blocked: false, suggest_escalate: true },
        };
      }
    }

    // Save conversation and increment usage ONCE
    if (effectiveWorkspaceId && quotaInfo) {
      // Increment usage only ONCE per question
      await incrementUsage(supabase, effectiveWorkspaceId, user.id, quotaInfo.bypass);
      
      // Save conversation
      await saveConversation(
        supabase,
        user.id,
        effectiveWorkspaceId,
        conversation_id || null,
        user_message,
        response.assistant_text,
        response.flags
      );
      
      // Add debug info for superadmin
      if (quotaInfo.is_superadmin) {
        response.debug = {
          limit: quotaInfo.limit,
          used: quotaInfo.used + 1, // +1 because we just incremented
          remaining: quotaInfo.bypass ? 999 : Math.max(0, quotaInfo.limit - quotaInfo.used - 1),
          plan_used: quotaInfo.plan_used,
          limit_source: quotaInfo.limit_source,
          bypass: quotaInfo.bypass,
          bypass_active: quotaInfo.bypass,
          is_superadmin: quotaInfo.is_superadmin,
          ai_admin_bypass_flag: quotaInfo.ai_admin_bypass_flag,
        };
      }
    }

    console.log('[ai-ask] Response sent:', { route: response.flags.decision_route, hasActionFlow: !!response.action_flow_data });

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error('[ai-ask] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        assistant_text: "Desculpe, ocorreu um erro. Por favor, tente novamente.",
        actions: [{ type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' }],
        flags: { decision_route: 'error' },
        safety: { blocked: false, suggest_escalate: true },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
