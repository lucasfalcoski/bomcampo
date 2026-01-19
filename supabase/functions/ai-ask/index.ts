import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
// Expanded to cover 300+ real-life variations with typos, abbreviations, and informal language
const INTENT_PATTERNS = {
  register_activity: [
    // Core patterns - "fiz/fizemos/realizei"
    /fiz(emos)?\s+(uma?\s*)?(limp[ea]?[sz]?[ao]?|ro[çc]a(da|gem)?|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina|irriga[çc][ãa]o|poda|preparo|desbrota|replantio)/i,
    /realizei?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina)/i,
    // "foi feito/feita"
    /foi\s+feit[ao]\s+(uma?\s*)?(limpeza|ro[çc]a(da|gem)?|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|carreiro|regulagem|revis[ãa]o)/i,
    // "registrar/anota" patterns
    /registr(ar?|ei|amos)\s+(uma?\s*)?(atividade|limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o)/i,
    /anota(r)?\s+(a[ií]?|que)?\s*(atividade|limpeza|ro[çc]a(da|gem)?|aduba[çc][ãa]o|hoje|hj)/i,
    /lan[çc]ar\s+(atividade|trabalho)/i,
    /hoje\s+(fiz|fizemos|realizamos)/i,
    /aplicamos\s+(adubo|fertilizante|calc[áa]rio)/i,
    /colhemos|plantamos|irrigamos|podamos|adubei|capinei|irriguei/i,
    // Abbreviated patterns: "T2:", "t3:", "talhão1"
    /t\d+:\s*(limpeza|ro[çc]a|poda|aduba|feita?|conclu[íi]da)/i,
    /(talhao|talh[ãa]o)\s*\d+\s*(limpeza|ro[çc]a|poda|conclu[íi]d[ao]|feit[ao]|agora|hj)/i,
    // Maintenance/repair patterns
    /consert(ei|amos)\s+(cano|bomba|porteira|cerca)/i,
    /fiz\s+manuten[çc][ãa]o\s+(na|no|da|do)/i,
    /troca\s+(de\s+)?(bico|[óo]leo|rolamento)/i,
    /lavagem\s+(do|da)\s+(pulverizador|epi|m[áa]quina)/i,
    // Irrigation/gotejo patterns
    /(desentupimos|sangria|revis[ãa]o|regulagem)\s+(gotejador|aspersor|gotejo|linha)/i,
    /vistoria\s+(das?\s+)?(mangueira|gotejo|irriga)/i,
    // Harvest/terrain patterns
    /limpeza\s+(do\s+)?terreiro/i,
    /coleta\s+(de\s+)?(amostra|solo|folha)/i,
    // General activities with "registra/anota"
    /registra\s*[.:,]?\s*(ro[çc]a|poda|limpeza|capina|aduba|irriga|colheita)/i,
    /anota\s*[.:,]?\s*que\s+(hoje\s+)?(fiz|fizemos|realizamos)/i,
    // Informal/abbreviated
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
    // Conjugations
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
    // Informal "coloca pra eu"
    /coloca\s+pra\s+(eu|mim)\s+(registrar|lembrar|verificar)/i,
  ],
  open_screen: [
    // Direct screen patterns
    /abr(e|a|ir)\s+(a\s+)?(tela\s+de\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es|fazendas|dashboard|atividades|ocorr[êe]ncias|plantios|tarefas)/i,
    /mostrar?\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|atividades|tarefas|alertas)/i,
    /ver\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es|hist[óo]rico|custos|receita|consumo)/i,
    /ir\s+para\s+(clima|relat[óo]rios?|pre[çc]os|financeiro)/i,
    /quero\s+(ver|acessar)\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|atividades|tarefas|alertas|painel|calend[áa]rio)/i,
    /acessar\s+(o\s+)?(m[óo]dulo|tela|[áa]rea)\s+(de\s+)?(clima|financeiro|plantios|atividades)/i,
    // Specific report patterns
    /relat[óo]rio\s+(mensal|por\s+talh[ãa]o|de\s+despesas|semanal)/i,
    /lista\s+(de\s+)?(ocorr[êe]ncias|tarefas|atividades)/i,
    // Admin patterns
    /gerenciar\s+usu[áa]rios/i,
    /v[íi]nculo\s+(do\s+)?agr[ôo]nomo/i,
    /abr(e|ir)\s+(admin|integra[çc][õo]es|auditoria)/i,
    // Abbreviated
    /abre\s+(clima|talh[õo]es|plantios|financeiro|relat[óo]rios?)/i,
    /dashboard\s+geral/i,
    /painel\s+(do\s+)?b2b/i,
  ],
  high_risk_today: [
    // Core "posso/dá para" patterns
    /posso\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|passar|mexer|secar)\s*(hoje|agora|hj|cedo)?/i,
    /d[áa]\s+(para|pra)\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|plantar|secar)\s*(hoje|agora|hj)?/i,
    // Weather condition patterns
    /hoje\s+[ée]\s+bom\s+(dia|momento)\s+(para|de)\s+(pulverizar|aplicar|adubar)/i,
    /condi[çc][õo]es?\s+(para|de)\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)\s*(hoje)?/i,
    /janela\s+de\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)/i,
    /hora\s+(boa|ideal)\s+(para|de)\s+(pulverizar|aplicar)/i,
    /(pulverizar|aplicar)\s+agora/i,
    /melhor\s+(hora|momento)\s+(para|de|do\s+dia)\s+(aplicar|pulverizar)/i,
    // Condition-based questions
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
    // Informal variations
    /rola\s+aplicar/i,
    /consigo\s+ro[çc]ar/i,
    /posso\s+passar\s+veneno/i,
    /d[áa]\s+pra\s+entrar\s+(de\s+)?trator/i,
    /d[áa]\s+pra\s+fazer\s+preparo/i,
    /d[áa]\s+pra\s+passar\s+herbicida/i,
    /o\s+que\s+checar\s+antes/i,
    /quero\s+aplicar\s+hoje/i,
    // Rajada/previsão patterns
    /rajada\s+de\s+vento.*d[áa]/i,
    /previs[ãa]o\s+de\s+chuva.*posso/i,
    /chuva\s+parar.*posso\s+aplicar/i,
    /temperatura\s+cair.*posso/i,
    // Segurança patterns
    /[ée]\s+seguro\s+entrar/i,
  ],
  observation_diagnosis: [
    // Leaf symptoms
    /folha(s)?\s+(amarela|seca|murcha|manchada|com\s+mancha|enrolando|queimando|bronzeada|com\s+pont|com\s+perfura)/i,
    /folha\s+(com\s+)?(pontinhos?|p[óo]\s+preto|pequenas?\s+perfura)/i,
    /mancha(s)?\s+(na|nas|em|circular)\s+(folha|planta|fruto)/i,
    /murcha(ndo|s)?/i,
    /broto\s+(novo\s+)?t[áa]\s+secando/i,
    /planta\s+(com\s+)?aspecto\s+queimado/i,
    // Pest patterns
    /praga/i,
    /inseto/i,
    /[áa]caro/i,
    /ferrugem/i,
    /formiga/i,
    /mofo/i,
    /fungo/i,
    /lagarta/i,
    /percevejo/i,
    /pulgão/i,
    /trip(e|s)/i,
    /mosca\s+branca/i,
    /nematoide/i,
    /ant?racnose/i,
    /m[íi]ldio/i,
    /o[íi]dio/i,
    /podrid[ãa]o/i,
    /necrose/i,
    /clorose/i,
    /queima/i,
    /broca/i,
    // Identification patterns
    /identific(ar|a[çc][ãa]o|ou)/i,
    /sintoma/i,
    /o\s+que\s+[ée]\s+isso/i,
    /que\s+praga\s+[ée]/i,
    /pode\s+ser\s+(praga|doen[çc]a)/i,
    /como\s+confirm(o|ar)/i,
    /como\s+investigar/i,
    /isso\s+preocupa/i,
    // Informal patterns
    /bicho\s+pequeno\s+na\s+folha/i,
    /tem\s+uns\s+bicho/i,
    /teia\s+fina/i,
    /frutos?\s+caindo/i,
    /inseto\s+voando/i,
    /formigueiro\s+apareceu/i,
    /caule\s+com\s+les[ãa]o/i,
    /raiz\s+exposta/i,
    /plantas?\s+mais\s+baixas/i,
    /mato\s+subiu\s+r[áa]pido/i,
    /fruto\s+com\s+mancha/i,
    /eros[ãa]o\s+come[çc]ando/i,
    /[áa]gua\s+empoçando/i,
    /press[ãa]o\s+(do\s+)?gotejo\s+caiu/i,
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
    // Specific patterns
    /criar\s+talh[ãa]?o\s*\d+/i,
    /cadastrar\s+plantio\s+caf[ée]/i,
    /criar\s+fazenda/i,
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
    // Specific finance patterns
    /registra(r)?\s+despesa\s*:\s*(diesel|pe[çc]as|m[ãa]o\s+de\s+obra)/i,
    /despesa\s+(diesel|combust[íi]vel|pe[çc]as|m[ãa]o\s+de\s+obra)/i,
    /custo\s+(do\s+)?trator/i,
    /receita\s*:\s*venda/i,
    /venda\s+de\s+caf[ée]/i,
    /total\s+de\s+despesas/i,
    /financeiro\s+do\s+m[êe]s/i,
  ],
  weather: [
    /clima/i,
    /previs[ãa]o/i,
    /chuva\s+(pra|para|de)\s+h(oje|j)/i,
    /chov(e|er|eu|a|endo)/i,
    /vai\s+chover/i,
    /temperatura/i,
    /umidade/i,
    /vento/i,
    /como\s+(est[aá]|vai\s+estar)\s+o\s+tempo/i,
    /calor/i,
    /frio/i,
    /geada/i,
    /seca/i,
    /alertas?\s+(do\s+)?tempo/i,
    /previsao\s+chuva/i,
  ],
};

// ========== ACTIVITY TYPES ==========
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
}

// ========== HELPER FUNCTIONS ==========
function getTodayBRT(): string {
  const now = new Date();
  const brtOffset = -3 * 60;
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const brtTime = new Date(utcTime + brtOffset * 60000);
  return brtTime.toISOString().split('T')[0];
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
  // Prioridade: high_risk_today primeiro
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
    // Limpeza variations
    { pattern: /limp[ea]?[sz]?[ao]?/i, tipo: 'limpeza' },
    // Roçada variations (rocada, roça, roçagem, roçada)
    { pattern: /ro[çc]a(da|gem)?/i, tipo: 'rocada' },
    // Adubação variations
    { pattern: /aduba[çc][ãa]o|adubar|adubamos|adubei|calc[áa]rio/i, tipo: 'adubacao' },
    // Pulverização
    { pattern: /pulveriza[çc][ãa]o|pulverizar/i, tipo: 'pulverizacao' },
    // Colheita
    { pattern: /colheita|colher|colhemos/i, tipo: 'colheita' },
    // Manutenção (conserto, troca, revisão, lubrificação, lavagem)
    { pattern: /manuten[çc][ãa]o|consert(ei|amos)|troca\s+(de\s+)?(bico|[óo]leo|rolamento)|revis[ãa]o|lubrifica[çc][ãa]o|lavagem/i, tipo: 'manutencao' },
    // Capina
    { pattern: /capina|capinei/i, tipo: 'capina' },
    // Irrigação (irrigação, gotejo, aspersor, sangria)
    { pattern: /irriga[çc][ãa]o|irrigar|irriguei|gotejo|aspersor|sangria/i, tipo: 'irrigacao' },
    // Plantio (plantio, replantio)
    { pattern: /plantio|plantar|replantio/i, tipo: 'plantio' },
    // Preparo de solo
    { pattern: /preparo\s+(de\s+)?solo/i, tipo: 'preparo_solo' },
    // Poda (poda, desbrota, amarração)
    { pattern: /poda|podar|desbrota|amarr[açã][ãa]o/i, tipo: 'poda' },
    // Carreiro
    { pattern: /carreiro/i, tipo: 'outros' },
    // Coleta
    { pattern: /coleta\s+(de\s+)?(amostra|solo|folha)/i, tipo: 'outros' },
    // Controle de formiga
    { pattern: /controle\s+(de\s+)?formiga/i, tipo: 'outros' },
    // Cobertura morta
    { pattern: /cobertura\s+morta/i, tipo: 'outros' },
    // Armadilhas
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
    { pattern: /tarefas?\s+atrasadas?/i, route: '/', label: 'Dashboard' },
    { pattern: /ocorr[êe]ncias?/i, route: '/talhoes', label: 'Ocorrências' },
    { pattern: /calend[áa]rio/i, route: '/', label: 'Calendário' },
    { pattern: /hist[óo]rico/i, route: '/talhoes', label: 'Histórico' },
    { pattern: /custos?\s+por\s+talh[ãa]o/i, route: '/relatorios', label: 'Relatórios' },
    { pattern: /consumo\s+(de\s+)?ia/i, route: '/configuracoes', label: 'Configurações' },
    { pattern: /integra[çc][õo]es/i, route: '/configuracoes', label: 'Integrações' },
    { pattern: /admin/i, route: '/admin', label: 'Admin' },
    { pattern: /auditoria/i, route: '/admin/auditoria', label: 'Auditoria' },
    { pattern: /v[íi]nculo\s+(do\s+)?agr[ôo]nomo/i, route: '/org/agronomists', label: 'Agrônomos' },
    { pattern: /gerenciar\s+usu[áa]rios/i, route: '/org/users', label: 'Usuários' },
    { pattern: /painel\s+(do\s+)?b2b/i, route: '/org', label: 'Painel B2B' },
  ];
  
  for (const { pattern, route, label } of patterns) {
    if (pattern.test(message)) return { route, label };
  }
  return null;
}

function extractOccurrenceCategory(message: string): string {
  const patterns = [
    // Pragas - expanded
    { pattern: /praga|inseto|lagarta|percevejo|pulg[ãa]o|trip|mosca|[áa]caro|formiga|nematoide|broca|bicho/i, category: 'praga' },
    // Doenças - expanded
    { pattern: /doen[çc]a|fungo|ferrugem|mofo|ant?racnose|m[íi]ldio|o[íi]dio|podrid[ãa]o|necrose|teia|les[ãa]o/i, category: 'doenca' },
    // Deficiência - expanded
    { pattern: /defici[êe]ncia|amarela|clorose|nutricional|queimando\s+na\s+ponta|folha\s+enrolando/i, category: 'deficiencia' },
    // Dano climático
    { pattern: /geada|granizo|vento\s+forte|temporal|eros[ãa]o|encharcado|empoçando/i, category: 'dano_climatico' },
    // Erva daninha
    { pattern: /erva\s+daninha|invasora|mato\s+subiu/i, category: 'erva_daninha' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) return category;
  }
  return 'outro';
}

function extractFinanceType(message: string): 'receita' | 'custo' {
  if (/receita|vendi|recebi|entrada|faturamento|venda\s+de/i.test(message)) return 'receita';
  return 'custo';
}

function extractFinanceCategory(message: string): string {
  const patterns = [
    { pattern: /insumo|semente|defensivo|fertilizante/i, category: 'insumo' },
    { pattern: /m[ãa]o\s+de\s+obra|funcion[áa]rio|di[áa]ria|prestador/i, category: 'mao_obra' },
    { pattern: /m[áa]quina|trator|combust[íi]vel|diesel|pe[çc]as?/i, category: 'maquinas' },
    { pattern: /energia|luz|eletricidade/i, category: 'energia' },
    { pattern: /transporte|frete/i, category: 'transporte' },
    { pattern: /venda|vendi/i, category: 'venda' },
    { pattern: /adubo|aduba[çc][ãa]o|calc[áa]rio/i, category: 'adubacao' },
    { pattern: /luva|m[áa]scara|epi/i, category: 'outros' },
    { pattern: /sacaria/i, category: 'outros' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) return category;
  }
  return 'outros';
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
async function getUserFarms(supabase: any, userId: string): Promise<Array<{ id: string; nome: string }>> {
  const { data } = await supabase
    .from('farms')
    .select('id, nome')
    .eq('user_id', userId)
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
async function checkQuota(supabase: any, workspaceId: string, userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const today = getTodayBRT();
  const { data: flags } = await supabase
    .from('feature_flags_workspace')
    .select('key, value_json')
    .eq('workspace_id', workspaceId);
  
  let limit = 10;
  const wsFlags = flags || [];
  for (const f of wsFlags) {
    if (f.key === 'ai_daily_quota' && typeof f.value_json === 'number') {
      limit = f.value_json;
    }
  }
  
  const { data: usage } = await supabase
    .from('ai_usage_log')
    .select('requests')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('day', today);
  
  const used = usage?.reduce((sum: number, r: { requests: number }) => sum + (r.requests || 0), 0) || 0;
  return { allowed: used < limit, remaining: Math.max(0, limit - used) };
}

// deno-lint-ignore no-explicit-any
async function incrementUsage(supabase: any, workspaceId: string, userId: string, source: string): Promise<void> {
  const today = getTodayBRT();
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

    // 2. Check quota
    const effectiveWorkspaceId = workspace_id || await getWorkspaceId(supabase, user.id);
    if (effectiveWorkspaceId) {
      const { allowed, remaining } = await checkQuota(supabase, effectiveWorkspaceId, user.id);
      if (!allowed) {
        const response: AIResponse = {
          assistant_text: `📊 **Limite diário atingido.**\n\nSeu limite será renovado amanhã. Enquanto isso:\n- Consulte nossos conteúdos técnicos\n- Envie sua dúvida para um agrônomo`,
          actions: [
            { type: 'open_screen', label: 'Ver Planos', payload: { route: '/configuracoes' } },
            { type: 'escalate_to_agronomist', label: 'Perguntar ao Agrônomo' },
          ],
          flags: { decision_route: 'quota_exceeded' },
          safety: { blocked: false, suggest_escalate: true },
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
      const farms = await getUserFarms(supabase, user.id);
      
      response = {
        assistant_text: `⚠️ **Checklist de Segurança para Aplicação**\n\nAntes de aplicar, verifique:\n\n☐ **Chuva**: Sem previsão de chuva nas próximas 6-12h\n☐ **Vento**: Rajadas abaixo de 10 km/h\n☐ **Umidade**: Entre 60-90% (evitar inversão térmica)\n☐ **Temperatura**: Abaixo de 30°C\n☐ **Orvalho**: Aguardar secar se houver\n☐ **Solo**: Verificar se o acesso está liberado\n☐ **Equipamento**: Calibrado e em bom estado\n\n📊 **Consulte o módulo Clima** para ver as condições atuais e a janela de aplicação recomendada.\n\n👨‍🌾 **Importante**: Consulte sempre o agrônomo RT para decisões de aplicação.`,
        actions: [
          { type: 'open_screen', label: '☁️ Ver Clima', payload: { route: '/clima' } },
          { type: 'escalate_to_agronomist', label: 'Consultar Agrônomo' },
        ],
        action_flow_data: {
          id: `task_check_${Date.now()}`,
          title: 'Criar Tarefa de Verificação',
          entity: 'task',
          fields: [
            {
              key: 'title',
              label: 'Título',
              type: 'text',
              value: 'Verificar janela de aplicação',
              required: true,
            },
            {
              key: 'due_date',
              label: 'Data',
              type: 'date',
              value: today,
            },
            {
              key: 'priority',
              label: 'Prioridade',
              type: 'select',
              value: 'high',
              options: PRIORITY_OPTIONS,
            },
            {
              key: 'farm_id',
              label: 'Fazenda',
              type: 'select',
              value: farm_id || '',
              options: farms.map(f => ({ value: f.id, label: f.nome })),
            },
          ],
          confirm_label: 'Criar Tarefa',
          cancel_label: 'Pular',
          on_confirm: {
            endpoint: '/functions/v1/tasks-create',
            method: 'POST',
            body_map: { workspace_id: 'workspace_id', title: 'title', due_date: 'due_date', priority: 'priority', farm_id: 'farm_id' },
          },
        },
        flags: { decision_route: 'high_risk_today', show_escalate_to_agronomist: true },
        safety: { blocked: false, suggest_escalate: true },
      };
    }

    // E) OBSERVATION_DIAGNOSIS
    else if (intent === 'observation_diagnosis') {
      const category = extractOccurrenceCategory(user_message);
      const categoryLabel = OCCURRENCE_CATEGORIES.find(c => c.value === category)?.label || 'Ocorrência';
      let plots: Array<{ id: string; nome: string }> = [];
      if (farm_id) {
        plots = await getFarmPlots(supabase, farm_id);
      }

      response = {
        assistant_text: `🔍 **Possível ${categoryLabel} identificada**\n\n**Próximos passos seguros:**\n1. 📸 Tire fotos claras dos sintomas\n2. 🔎 Inspecione plantas vizinhas\n3. 📝 Registre a área afetada\n4. 👨‍🌾 Envie para o agrônomo avaliar\n\n⚠️ **Não aplique produtos sem orientação do RT.**\n\nRegistre a ocorrência abaixo para acompanhamento.`,
        actions: [
          { type: 'escalate_to_agronomist', label: 'Enviar para Agrônomo' },
        ],
        action_flow_data: {
          id: `occurrence_${Date.now()}`,
          title: 'Registrar Ocorrência',
          entity: 'occurrence',
          fields: [
            {
              key: 'category',
              label: 'Categoria',
              type: 'select',
              value: category,
              options: OCCURRENCE_CATEGORIES,
              required: true,
            },
            {
              key: 'talhao_id',
              label: 'Talhão',
              type: 'select',
              value: plot_id || '',
              options: plots.map(p => ({ value: p.id, label: p.nome })),
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
        flags: { decision_route: 'observation_diagnosis', show_escalate_to_agronomist: true },
        safety: { blocked: false, suggest_escalate: true },
      };
    }

    // F) CADASTRO (plantio)
    else if (intent === 'cadastro') {
      const farms = await getUserFarms(supabase, user.id);
      let plots: Array<{ id: string; nome: string }> = [];
      if (farm_id) {
        plots = await getFarmPlots(supabase, farm_id);
      }

      // Get crops
      const { data: crops } = await supabase.from('crops').select('id, nome, variedade').order('nome');
      const cropOptions = (crops || []).map((c: { id: string; nome: string; variedade?: string }) => ({
        value: c.id,
        label: c.variedade ? `${c.nome} - ${c.variedade}` : c.nome,
      }));

      response = {
        assistant_text: `🌱 **Vamos cadastrar um novo plantio!**\n\nPreencha os dados abaixo.`,
        actions: [],
        action_flow_data: {
          id: `planting_${Date.now()}`,
          title: 'Cadastrar Plantio',
          entity: 'planting',
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
              key: 'plot_id',
              label: 'Talhão',
              type: 'select',
              value: plot_id || '',
              options: plots.map(p => ({ value: p.id, label: p.nome })),
              required: true,
            },
            {
              key: 'crop_id',
              label: 'Cultura',
              type: 'select',
              value: '',
              options: cropOptions,
              required: true,
            },
            {
              key: 'data_plantio',
              label: 'Data de Plantio',
              type: 'date',
              value: today,
              required: true,
            },
          ],
          confirm_label: 'Cadastrar Plantio',
          cancel_label: 'Cancelar',
          on_confirm: {
            endpoint: '/functions/v1/plantings-create',
            method: 'POST',
            body_map: { plot_id: 'plot_id', crop_id: 'crop_id', data_plantio: 'data_plantio' },
          },
        },
        flags: { decision_route: 'cadastro' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // G) FINANCEIRO
    else if (intent === 'financeiro') {
      const farms = await getUserFarms(supabase, user.id);
      const tipo = extractFinanceType(user_message);
      const categoria = extractFinanceCategory(user_message);

      response = {
        assistant_text: `💰 **Vamos registrar uma ${tipo === 'receita' ? 'receita' : 'despesa'}!**\n\nPreencha os dados abaixo.`,
        actions: [
          { type: 'open_screen', label: '📊 Ver Financeiro', payload: { route: '/financeiro' } },
        ],
        action_flow_data: {
          id: `finance_${Date.now()}`,
          title: tipo === 'receita' ? 'Registrar Receita' : 'Registrar Despesa',
          entity: 'finance',
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
              value: tipo,
              options: [
                { value: 'receita', label: 'Receita' },
                { value: 'custo', label: 'Despesa/Custo' },
              ],
              required: true,
            },
            {
              key: 'categoria',
              label: 'Categoria',
              type: 'select',
              value: categoria,
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

    // WEATHER
    else if (intent === 'weather') {
      response = {
        assistant_text: `🌤️ **Consulte o módulo Clima!**\n\nO módulo Clima oferece:\n📊 Previsão detalhada\n🌧️ Alertas de chuva\n📈 Histórico climático\n🚜 Janelas de pulverização\n\nClique abaixo para acessar.`,
        actions: [
          { type: 'open_screen', label: '☁️ Acessar Clima', payload: { route: '/clima' } },
        ],
        flags: { decision_route: 'weather' },
        safety: { blocked: false, suggest_escalate: false },
      };
    }

    // GENERAL - Fallback com IA
    else {
      // Try to call AI for general questions
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

    // Save conversation and increment usage
    if (effectiveWorkspaceId) {
      await incrementUsage(supabase, effectiveWorkspaceId, user.id, 'copilot');
      await saveConversation(
        supabase,
        user.id,
        effectiveWorkspaceId,
        conversation_id || null,
        user_message,
        response.assistant_text,
        response.flags
      );
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
