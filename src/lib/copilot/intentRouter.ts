/**
 * Intent Router - Classificação determinística de intenções do usuário
 */

export type Intent = 
  | 'register_activity'
  | 'create_task'
  | 'open_screen'
  | 'high_risk_today'
  | 'observation_diagnosis'
  | 'cadastro'
  | 'financeiro'
  | 'weather'
  | 'general';

// Patterns para detecção de intenções (rules-first approach)
const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  // A) Registrar atividade - "fiz/foi feito/realizei/registra/anota" + tipo
  register_activity: [
    /fiz(emos)?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina|irriga[çc][ãa]o|poda|preparo)/i,
    /realizei?\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita|manuten[çc][ãa]o|capina)/i,
    /foi\s+feit[ao]\s+(uma?\s*)?(limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o|colheita)/i,
    /registr(ar?|ei|amos)\s+(uma?\s*)?(atividade|limpeza|ro[çc]ada|aduba[çc][ãa]o|pulveriza[çc][ãa]o)/i,
    /anota(r)?\s+(a[ií]?|que)?\s*(atividade|limpeza|ro[çc]ada|aduba[çc][ãa]o)/i,
    /lan[çc]ar\s+(atividade|trabalho)/i,
    /hoje\s+(fiz|fizemos|realizamos)/i,
    /aplicamos\s+(adubo|fertilizante)/i,
    /colhemos|plantamos|irrigamos|podamos/i,
  ],
  
  // B) Criar tarefa - "me lembra/cria tarefa/agendar/checklist/monitorar"
  create_task: [
    /me\s+lembr(a|e)/i,
    /cria(r)?\s+(uma?\s*)?(tarefa|checklist|lembrete)/i,
    /agendar/i,
    /monitorar/i,
    /preciso\s+(lembrar|agendar|fazer)/i,
    /n[ãa]o\s+esquecer/i,
    /colocar?\s+(na|no)\s+(agenda|calend[áa]rio)/i,
    /programar/i,
    /tarefa\s+(para|de)/i,
  ],
  
  // C) Abrir tela/relatório - "abre/mostrar/ver" + módulo
  open_screen: [
    /abr(e|a|ir)\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es|fazendas|dashboard)/i,
    /mostrar?\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro)/i,
    /ver\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os|financeiro|talh[õo]es)/i,
    /ir\s+para\s+(clima|relat[óo]rios?|pre[çc]os|financeiro)/i,
    /quero\s+(ver|acessar)\s+(o\s+)?(clima|relat[óo]rio|pre[çc]os)/i,
    /acessar\s+(o\s+)?(m[óo]dulo|tela)\s+(de\s+)?(clima|financeiro)/i,
  ],
  
  // D) "HOJE" alto risco - "posso ... hoje" com ações de campo
  high_risk_today: [
    /posso\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar\s+com\s+m[áa]quina)\s*(hoje)?/i,
    /d[áa]\s+para\s+(pulverizar|aplicar|adubar|irrigar|plantar)\s*(hoje)?/i,
    /hoje\s+[ée]\s+bom\s+(dia|momento)\s+(para|de)\s+(pulverizar|aplicar|adubar)/i,
    /condi[çc][õo]es?\s+(para|de)\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)\s*(hoje)?/i,
    /janela\s+de\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)/i,
    /hora\s+(boa|ideal)\s+(para|de)\s+(pulverizar|aplicar)/i,
    /(pulverizar|aplicar)\s+agora/i,
    /melhor\s+(hora|momento)\s+(para|de)\s+(aplicar|pulverizar)/i,
  ],
  
  // E) Observação/diagnóstico - sintomas de pragas/doenças
  observation_diagnosis: [
    /folha(s)?\s+(amarela|seca|murcha|manchada|com\s+mancha)/i,
    /mancha(s)?\s+(na|nas|em)\s+(folha|planta|fruto)/i,
    /murcha(ndo|s)?/i,
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
    /seca(ndo)?(\s+da)?/i,
    /identific(ar|a[çc][ãa]o|ou)/i,
    /sintoma/i,
    /problema\s+(na|no|com)/i,
    /o\s+que\s+[ée]\s+isso/i,
    /que\s+praga\s+[ée]/i,
    /pode\s+ser\s+(praga|doen[çc]a)/i,
  ],
  
  // F) Cadastro - "cadastrar/criar talhão/registrar plantio/adicionar fazenda"
  cadastro: [
    /cadastr(ar|o)\s+(talh[ãa]o|fazenda|plantio|cultura)/i,
    /criar\s+(novo?\s+)?(talh[ãa]o|fazenda|plantio)/i,
    /adicionar\s+(talh[ãa]o|fazenda|plantio|cultura)/i,
    /registrar\s+(novo?\s+)?(plantio|safra|cultura)/i,
    /novo\s+(talh[ãa]o|plantio|fazenda)/i,
    /atualizar\s+(variedade|[áa]rea|data)/i,
    /mudar\s+(cultura|variedade)/i,
  ],
  
  // G) Financeiro - "registrar despesa/custo/receita/quanto gastei"
  financeiro: [
    /registrar?\s+(despesa|custo|gasto|receita)/i,
    /lan[çc]ar\s+(despesa|custo|gasto|receita)/i,
    /quanto\s+(gastei|gastar|custou)/i,
    /anotar\s+(gasto|despesa|custo)/i,
    /adicionar\s+(despesa|receita|custo)/i,
    /relat[óo]rio\s+financeiro/i,
    /despesas?\s+(do|da|de)/i,
    /custos?\s+(do|da|de|operacional)/i,
    /lucro|preju[íi]zo|balan[çc]o/i,
    /quanto\s+(vendi|recebi)/i,
  ],
  
  // Weather patterns
  weather: [
    /clima/i,
    /previs[ãa]o/i,
    /chuva/i,
    /chov(e|er|eu|a|endo)/i,
    /vai\s+chover/i,
    /temperatura/i,
    /umidade/i,
    /vento/i,
    /precipita[çc][ãa]o/i,
    /como\s+(est[aá]|vai\s+estar)\s+o\s+tempo/i,
    /calor/i,
    /frio/i,
    /geada/i,
    /seca/i,
    /estia(gem)?/i,
  ],
  
  // General - fallback
  general: [],
};

// Classifica a intenção do usuário
export function classifyIntent(message: string): Intent {
  // Primeiro, verifica high_risk_today (prioridade máxima)
  for (const pattern of INTENT_PATTERNS.high_risk_today) {
    if (pattern.test(message)) {
      return 'high_risk_today';
    }
  }
  
  // Depois verifica outras intenções por ordem de prioridade
  const priorityOrder: Intent[] = [
    'register_activity',
    'create_task',
    'observation_diagnosis',
    'financeiro',
    'cadastro',
    'open_screen',
    'weather',
  ];
  
  for (const intent of priorityOrder) {
    for (const pattern of INTENT_PATTERNS[intent]) {
      if (pattern.test(message)) {
        return intent;
      }
    }
  }
  
  return 'general';
}

// Extrai informações de atividade do texto
export function extractActivityType(message: string): string | null {
  const patterns: Array<{ pattern: RegExp; tipo: string }> = [
    { pattern: /limpeza/i, tipo: 'limpeza' },
    { pattern: /ro[çc]ada/i, tipo: 'rocada' },
    { pattern: /aduba[çc][ãa]o|adubar|adubamos/i, tipo: 'adubacao' },
    { pattern: /pulveriza[çc][ãa]o|pulverizar|pulverizamos/i, tipo: 'pulverizacao' },
    { pattern: /colheita|colher|colhemos/i, tipo: 'colheita' },
    { pattern: /manuten[çc][ãa]o/i, tipo: 'manutencao' },
    { pattern: /capina|capinamos/i, tipo: 'capina' },
    { pattern: /irriga[çc][ãa]o|irrigar|irrigamos/i, tipo: 'irrigacao' },
    { pattern: /plantio|plantar|plantamos/i, tipo: 'plantio' },
    { pattern: /preparo\s+(de\s+)?solo/i, tipo: 'preparo_solo' },
    { pattern: /poda|podar|podamos/i, tipo: 'poda' },
  ];
  
  for (const { pattern, tipo } of patterns) {
    if (pattern.test(message)) {
      return tipo;
    }
  }
  
  return null;
}

// Extrai tela mencionada
export function extractScreenRoute(message: string): string | null {
  const patterns: Array<{ pattern: RegExp; route: string }> = [
    { pattern: /clima|tempo|previs[ãa]o/i, route: '/clima' },
    { pattern: /relat[óo]rio/i, route: '/relatorios' },
    { pattern: /pre[çc]os?/i, route: '/precos' },
    { pattern: /financeiro|finan[çc]as?/i, route: '/financeiro' },
    { pattern: /talh[õo]es?/i, route: '/talhoes' },
    { pattern: /fazendas?/i, route: '/fazendas' },
    { pattern: /dashboard|in[íi]cio|home/i, route: '/' },
    { pattern: /configura[çc][õo]es?/i, route: '/configuracoes' },
  ];
  
  for (const { pattern, route } of patterns) {
    if (pattern.test(message)) {
      return route;
    }
  }
  
  return null;
}

// Extrai categoria de ocorrência
export function extractOccurrenceCategory(message: string): string | null {
  const patterns: Array<{ pattern: RegExp; category: string }> = [
    { pattern: /praga|inseto|lagarta|percevejo|pulg[ãa]o|trip|mosca|[áa]caro|formiga|nematoide/i, category: 'praga' },
    { pattern: /doen[çc]a|fungo|ferrugem|mofo|ant?racnose|m[íi]ldio|o[íi]dio|podrid[ãa]o/i, category: 'doenca' },
    { pattern: /defici[êe]ncia|amarela|clorose|nutricional/i, category: 'deficiencia' },
    { pattern: /geada|granizo|vento\s+forte|temporal|seca\s+extrema/i, category: 'dano_climatico' },
    { pattern: /erva\s+daninha|invasora|tiri?rica|capim/i, category: 'erva_daninha' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) {
      return category;
    }
  }
  
  return 'outro';
}

// Extrai tipo financeiro
export function extractFinanceType(message: string): 'receita' | 'custo' {
  if (/receita|vendi|recebi|entrada|faturamento/i.test(message)) {
    return 'receita';
  }
  return 'custo';
}

// Extrai categoria financeira
export function extractFinanceCategory(message: string): string {
  const patterns: Array<{ pattern: RegExp; category: string }> = [
    { pattern: /insumo|semente|defensivo|fertilizante/i, category: 'insumo' },
    { pattern: /m[ãa]o\s+de\s+obra|funcion[áa]rio|di[áa]ria|sal[áa]rio/i, category: 'mao_obra' },
    { pattern: /m[áa]quina|trator|implemento|combust[íi]vel|diesel/i, category: 'maquinas' },
    { pattern: /energia|luz|eletricidade/i, category: 'energia' },
    { pattern: /transporte|frete/i, category: 'transporte' },
    { pattern: /venda|comercializa[çc][ãa]o/i, category: 'venda' },
    { pattern: /adubo|aduba[çc][ãa]o/i, category: 'adubacao' },
  ];
  
  for (const { pattern, category } of patterns) {
    if (pattern.test(message)) {
      return category;
    }
  }
  
  return 'outros';
}

// Extrai referência a talhão
export function extractPlotReference(message: string): string | null {
  const match = message.match(/talh[ãa]o\s+(\d+|[a-zA-Z]+)/i);
  if (match) {
    return match[1];
  }
  return null;
}
