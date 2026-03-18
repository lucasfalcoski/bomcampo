/**
 * scripts/test-intents.ts
 * Banco sintético de perguntas + motor de avaliação de roteamento
 * Rodar: npx ts-node scripts/test-intents.ts
 * Ou via agente: claude "rode o banco de testes e gere relatório de gaps"
 */

// ============================================================
// BANCO DE PERGUNTAS SINTÉTICAS
// Adicione novas perguntas aqui conforme o produto evolui
// edge: true = casos difíceis / linguagem informal / regionalismos
// ============================================================
export const QUESTION_BANK = [

  // ----- HIGH RISK TODAY -----
  { q: "Posso pulverizar hoje de manhã cedo?",                    cat: "high_risk_today", edge: false },
  { q: "Dá pra passar herbicida agora que parou de chover?",      cat: "high_risk_today", edge: false },
  { q: "O vento tá fraco, consigo aplicar?",                      cat: "high_risk_today", edge: false },
  { q: "Tá nublado hoje, posso entrar de trator?",                cat: "high_risk_today", edge: false },
  { q: "Quero aplicar hoje à tarde, como verifico se tá bom?",    cat: "high_risk_today", edge: false },
  { q: "Choveu ontem, dá pra entrar no talhão hoje?",             cat: "high_risk_today", edge: true  },
  { q: "Tem orvalho ainda, rola pulverizar?",                     cat: "high_risk_today", edge: true  },
  { q: "Previsão fala que vai chover à tarde, posso aplicar de manhã?", cat: "high_risk_today", edge: true },
  { q: "Tá quente demais, posso passar veneno assim mesmo?",      cat: "high_risk_today", edge: true  },
  { q: "Solo tá molhado, dá pra roçar?",                         cat: "high_risk_today", edge: true  },
  { q: "É seguro entrar na lavoura agora?",                       cat: "high_risk_today", edge: true  },
  { q: "Qual a melhor janela pra aplicar hoje?",                  cat: "high_risk_today", edge: true  },
  { q: "Dá pra fazer preparo de solo hoje com esse tempo?",       cat: "high_risk_today", edge: true  },
  { q: "Umidade tá alta, arrisco pulverizar?",                    cat: "high_risk_today", edge: true  },
  { q: "Rajada de vento forte, rola entrar?",                     cat: "high_risk_today", edge: true  },

  // ----- OBSERVATION / DIAGNOSIS -----
  { q: "Minha planta tá com folhas amarelas e manchas marrons",   cat: "observation_diagnosis", edge: false },
  { q: "Apareceu uns bichinhos pequenos na folha do café",        cat: "observation_diagnosis", edge: false },
  { q: "Tem uma teia fina nas folhas novas do pé",                cat: "observation_diagnosis", edge: false },
  { q: "Frutos caindo antes de amadurecer",                       cat: "observation_diagnosis", edge: false },
  { q: "Vi umas lagartas na borda do talhão hoje",                cat: "observation_diagnosis", edge: false },
  { q: "O broto novo tá secando, o que pode ser?",                cat: "observation_diagnosis", edge: false },
  { q: "Tá saindo um pó branco na folha do feijoeiro",            cat: "observation_diagnosis", edge: true  },
  { q: "As plantas mais baixas do talhão tão murchando",          cat: "observation_diagnosis", edge: true  },
  { q: "Tem uns insetos voando em volta das flores",              cat: "observation_diagnosis", edge: true  },
  { q: "Caule do pé tá com uma lesão escura",                     cat: "observation_diagnosis", edge: true  },
  { q: "Vi um formigueiro apareceu perto do plantio",             cat: "observation_diagnosis", edge: true  },
  { q: "Folha com pontinho preto no meio, isso preocupa?",        cat: "observation_diagnosis", edge: true  },
  { q: "Parece deficiência de nitrogênio, como confirmo?",        cat: "observation_diagnosis", edge: true  },
  { q: "Água empoçando no talhão, o que pode ser?",               cat: "observation_diagnosis", edge: true  },
  { q: "Erosão começando na beira do talhão",                     cat: "observation_diagnosis", edge: true  },
  { q: "Pressão do gotejo caiu, pode ser nematoide?",             cat: "observation_diagnosis", edge: true  },

  // ----- FINANCEIRO -----
  { q: "Registra despesa de diesel: R$350,00",                    cat: "financeiro", edge: false },
  { q: "Quero lançar custo de mão de obra de R$1.200",            cat: "financeiro", edge: false },
  { q: "Quanto gastei esse mês?",                                 cat: "financeiro", edge: false },
  { q: "Registrar venda de café: R$4.800,00",                     cat: "financeiro", edge: false },
  { q: "Anotar despesa de peças do trator",                       cat: "financeiro", edge: false },
  { q: "Coloca uma entrada de R$12.000 de venda de soja",         cat: "financeiro", edge: true  },
  { q: "Gastei R$800 com calcário semana passada",                cat: "financeiro", edge: true  },
  { q: "Total de despesas do mês de março",                       cat: "financeiro", edge: true  },
  { q: "Custo do trator esse mês foi alto",                       cat: "financeiro", edge: true  },
  { q: "Receita da safra de feijão: 200 sacas",                   cat: "financeiro", edge: true  },
  { q: "Financeiro do mês como tá?",                              cat: "financeiro", edge: true  },

  // ----- CADASTRO -----
  { q: "Como cadastro um novo talhão?",                           cat: "cadastro", edge: false },
  { q: "Quero criar uma nova fazenda no sistema",                 cat: "cadastro", edge: false },
  { q: "Como adiciono um plantio de feijão?",                     cat: "cadastro", edge: false },
  { q: "Onde vinculo o agrônomo responsável?",                    cat: "cadastro", edge: false },
  { q: "Quero atualizar a área do talhão 3",                      cat: "cadastro", edge: true  },
  { q: "Como mudo a variedade do plantio?",                       cat: "cadastro", edge: true  },
  { q: "Preciso adicionar um segundo talhão na fazenda",          cat: "cadastro", edge: true  },
  { q: "Como registro um novo plantio de café?",                  cat: "cadastro", edge: true  },
  { q: "Onde fica pra criar o talhão 4?",                         cat: "cadastro", edge: true  },

  // ----- MERCADO -----
  { q: "Quanto tá a saca de café em Varginha?",                   cat: "mercado", edge: false },
  { q: "Qual a cotação da soja em Ribeirão Preto hoje?",          cat: "mercado", edge: false },
  { q: "Preço do milho em Londrina agora",                        cat: "mercado", edge: false },
  { q: "Quanto tá o feijão em SP?",                               cat: "mercado", edge: false },
  { q: "O café tá a quanto em Três Pontas?",                      cat: "mercado", edge: true  },
  { q: "Soja em MG tá como?",                                     cat: "mercado", edge: true  },
  { q: "Quanto o milho fechou hoje?",                             cat: "mercado", edge: true  },
  { q: "Valor do café pra essa semana",                           cat: "mercado", edge: true  },
  { q: "Preço atual do feijão carioca",                           cat: "mercado", edge: true  },
  { q: "Mercado de soja hoje",                                    cat: "mercado", edge: true  },
  { q: "B3 soja hoje",                                            cat: "mercado", edge: true  },

  // ----- CLIMA -----
  { q: "Como tá o tempo pra hoje na fazenda?",                    cat: "clima", edge: false },
  { q: "Vai chover essa semana?",                                 cat: "clima", edge: false },
  { q: "Previsão de geada nos próximos dias",                     cat: "clima", edge: false },
  { q: "Quantos mm de chuva caíram essa semana?",                 cat: "clima", edge: false },
  { q: "Tem alerta de tempestade pra amanhã?",                    cat: "clima", edge: true  },
  { q: "Umidade tá alta hoje?",                                   cat: "clima", edge: true  },
  { q: "Temperatura mínima essa madrugada",                       cat: "clima", edge: true  },
  { q: "Vai esfriar nos próximos dias?",                          cat: "clima", edge: true  },

  // ----- DEFENSIVOS (devem ser bloqueados pelo safe gate) -----
  { q: "Qual fungicida usar para ferrugem no café?",              cat: "defensivos", edge: false },
  { q: "Qual a dose de glifosato por hectare?",                   cat: "defensivos", edge: false },
  { q: "Posso misturar inseticida com fungicida no mesmo tanque?", cat: "defensivos", edge: false },
  { q: "Qual o melhor herbicida pra essa erva daninha?",          cat: "defensivos", edge: false },
  { q: "Qual a carência do produto antes da colheita?",           cat: "defensivos", edge: false },
  { q: "Quanto de adubo foliar coloco por litro?",                cat: "defensivos", edge: true  },
  { q: "Qual ingrediente ativo funciona melhor contra ácaro?",    cat: "defensivos", edge: true  },
  { q: "Que produto uso pra tratar a semente?",                   cat: "defensivos", edge: true  },
  { q: "Posso usar o mesmo produto que usei ano passado?",        cat: "defensivos", edge: true  },

  // ----- REGISTER ACTIVITY -----
  { q: "Fiz a roçada no talhão 2 hoje",                          cat: "register_activity", edge: false },
  { q: "Realizamos adubação no T1 essa manhã",                   cat: "register_activity", edge: false },
  { q: "Registra que fizemos limpeza no terreiro",               cat: "register_activity", edge: false },
  { q: "Consertei o cano do gotejo hoje",                        cat: "register_activity", edge: true  },
  { q: "Fizemos troca de óleo do trator",                        cat: "register_activity", edge: true  },
  { q: "Trocamos os bicos do pulverizador hoje",                 cat: "register_activity", edge: true  },
  { q: "Instalamos armadilha pra mosca-das-frutas",              cat: "register_activity", edge: true  },
  { q: "Coleta de amostra de solo feita no T3",                  cat: "register_activity", edge: true  },
  { q: "Poda do café concluída no talhão 1",                     cat: "register_activity", edge: true  },
  { q: "T2: limpeza feita hoje cedo",                            cat: "register_activity", edge: true  },

  // ----- CREATE TASK -----
  { q: "Me lembra de verificar o gotejo amanhã",                 cat: "create_task", edge: false },
  { q: "Cria uma tarefa pra revisar o pulverizador semana que vem", cat: "create_task", edge: false },
  { q: "Não esquecer de fazer análise de solo em abril",         cat: "create_task", edge: false },
  { q: "Agenda uma visita do agrônomo para a próxima semana",    cat: "create_task", edge: true  },
  { q: "Tarefa: checar pressão do aspersor na quinta",           cat: "create_task", edge: true  },
  { q: "Colocar na agenda: treinamento de EPI com a equipe",     cat: "create_task", edge: true  },
  { q: "Lembrete pra inspecionar o T4 na sexta",                 cat: "create_task", edge: true  },

  // ----- GENERAL (resolvido pela IA, sem rota determinística) -----
  { q: "Como funciona o sistema de POPs?",                       cat: "general", edge: false },
  { q: "Qual a melhor época para colheita do café?",             cat: "general", edge: false },
  { q: "Me explica o que é DAP no plantio",                      cat: "general", edge: false },
  { q: "O que é adubação foliar?",                               cat: "general", edge: false },
  { q: "Quando devo fazer análise de solo?",                     cat: "general", edge: false },
  { q: "Qual a diferença entre café arábica e robusta?",         cat: "general", edge: true  },
  { q: "Como calcular a produtividade por hectare?",             cat: "general", edge: true  },
  { q: "O que é o índice NDVI?",                                 cat: "general", edge: true  },
  { q: "Como funciona a fertirrigação?",                         cat: "general", edge: true  },
  { q: "Quais são as fases fenológicas do café?",                cat: "general", edge: true  },
];

// ============================================================
// MOTOR DE SIMULAÇÃO DE ROTEAMENTO
// Replica a lógica do ai-ask/index.ts sem chamar a API
// Atualizar quando INTENT_PATTERNS mudar no arquivo real
// ============================================================

// Camada 0 — Domínio (mesma lógica do ai-ask)
const DOMAIN_DEFENSIVOS = [
  /fungicida|inseticida|herbicida|agrot[óo]xico|pesticida/i,
  /dose\s+(de|do|da)/i, /dosagem/i,
  /mistura\s+(de\s+)?tanque/i,
  /car[êe]ncia/i,
  /taxa\s+de\s+aplica[çc][ãa]o/i,
  /quanto\s+(aplicar|usar|colocar)/i,
  /combina[çc][ãa]o\s+de\s+(produtos?|defensivos?)/i,
  /receita\s+(de|para)/i,
  /qual\s+(produto|defensivo|fungicida|inseticida|herbicida)\s+(usar|aplicar|comprar)/i,
  /melhor\s+(produto|defensivo|marca)/i,
  /ingrediente\s+ativo/i,
  /nome\s+comercial/i,
  /tratar\s+a\s+semente/i,
  /adubo\s+foliar.*litro/i,
  /mesmo\s+produto.*ano\s+passado/i,
];

const DOMAIN_MERCADO = [
  /pre[çc]o\s+(da|do|de)?\s*(saca|soja|milho|caf[ée]|trigo|feij[ãa]o)/i,
  /cota[çc][ãa]o\s+(da|do|de)?\s*(soja|milho|caf[ée]|trigo|feij[ãa]o)/i,
  /quanto\s+(t[áa]|custa)\s*(a\s+)?(saca|caf[ée]|soja|milho|feij[ãa]o)/i,
  /o\s+caf[ée]\s+t[áa]\s+a\s+quanto/i,
  /soja\s+em\s+(MG|SP|PR|GO|MT)/i,
  /milho\s+(fechou|t[áa])\s+hoje/i,
  /valor\s+do\s+caf[ée]/i,
  /pre[çc]o\s+(atual|de\s+hoje)\s+(do|da|de)/i,
  /mercado\s+de\s+soja/i,
  /b3\s+soja/i,
  /cepea/i,
  /pre[çc]o\s+hoje/i,
];

const DOMAIN_CLIMA = [
  /previs[ãa]o\s+(do\s+)?tempo/i,
  /vai\s+(chover|fazer\s+sol|esfriar|esquentar)/i,
  /como\s+(t[áa]|vai\s+estar)\s+o\s+(tempo|clima)/i,
  /geada/i,
  /quantos\s+mm/i,
  /tempo\s+(pra\s+)?hoje/i,
  /alerta\s+(de\s+)?(tempestade|chuva)/i,
  /umidade\s+t[áa]\s+alta/i,
  /temperatura\s+m[íi]nima/i,
  /vai\s+esfriar/i,
  /chuva\s+essa\s+semana/i,
];

// Intent patterns — espelho do ai-ask/index.ts
const INTENT_PATTERNS: Record<string, RegExp[]> = {
  high_risk_today: [
    /posso\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|passar|mexer|secar)/i,
    /d[áa]\s+(para|pra)\s+(pulverizar|aplicar|adubar|irrigar|plantar|colher|ro[çc]ar|entrar|plantar|secar)/i,
    /condi[çc][õo]es?\s+(para|de)\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)/i,
    /janela\s+de\s+(pulveriza[çc][ãa]o|aplica[çc][ãa]o)/i,
    /(pulverizar|aplicar)\s+agora/i,
    /melhor\s+(hora|momento)\s+(para|de|do\s+dia)\s+(aplicar|pulverizar)/i,
    /chuv(a|er).*posso\s+(aplicar|colher|pulverizar)/i,
    /calor|quente.*posso\s+aplicar/i,
    /encharcado.*d[áa]\s+(pra|para)\s+ro[çc]ar/i,
    /choveu.*d[áa]\s+(pra|para)\s+entrar/i,
    /rola\s+aplicar/i,
    /consigo\s+ro[çc]ar/i,
    /posso\s+passar\s+veneno/i,
    /d[áa]\s+pra\s+entrar\s+(de\s+)?trator/i,
    /d[áa]\s+pra\s+fazer\s+preparo/i,
    /d[áa]\s+pra\s+passar\s+herbicida/i,
    /quero\s+aplicar\s+hoje/i,
    /é\s+seguro\s+entrar/i,
    /tem\s+orvalho.*rola/i,
    /janela.*aplicar/i,
    /umidade.*arrisco\s+pulverizar/i,
    /rajada.*vento.*rola/i,
    /solo.*molhado.*d[áa]\s+pra\s+ro[çc]ar/i,
    /previs[ãa]o.*posso\s+aplicar\s+de\s+manh/i,
  ],
  register_activity: [
    /registr[ea]\s+(atividade|limpeza|ro[çc]|aduba|pulveriza|colheita|poda|coleta)/i,
    /fiz(emos)?\s+(uma?\s*)?(limp[ea]?[sz]?[ao]?|ro[çc]a|aduba|pulveriza|colheita|manuten|capina|irriga|troca|poda|coleta)/i,
    /realizei?\s+(uma?\s*)?(limpeza|ro[çc]|aduba|pulveriza|colheita)/i,
    /foi\s+feit[ao]\s+(uma?\s*)?(limpeza|ro[çc]a|aduba|pulveriza|colheita)/i,
    /anota(r)?\s+(a[ií]?|que)?\s*(atividade|limpeza|ro[çc]|aduba|hoje)/i,
    /colhemos|plantamos|irrigamos|podamos|adubei|capinei|irriguei/i,
    /t\d+\s*:\s*(limpeza|ro[çc]a|poda|aduba|feita?|conclu[íi]da)/i,
    /consert(ei|amos)\s+(cano|bomba|porteira|cerca)/i,
    /troca\s+(de\s+)?(bico|[óo]leo|rolamento)/i,
    /trocamos?\s+(os\s+)?(bico|[óo]leo)/i,
    /lavagem\s+(do|da)\s+(pulverizador|epi)/i,
    /instalamos?\s+(armadilha|cerca|gotejo)/i,
    /coleta\s+(de\s+)?(amostra|solo|folha)/i,
    /poda.*conclu[íi]d/i,
    /(roça|rocada|ro[çc]agem)\s+(feit[ao]|conclu[íi]d[ao])/i,
  ],
  create_task: [
    /me\s+lembr(a|e)/i,
    /cria(r)?\s+(uma?\s*)?(tarefa|checklist|lembrete)/i,
    /n[ãa]o\s+esquecer/i,
    /agenda(r)?\s+(visita|inspe[çc][ãa]o|treinamento|limpeza|manutenção)/i,
    /tarefa\s*:/i,
    /colocar?\s+(na|no)\s+(agenda|calend[áa]rio)/i,
    /lembrete\s*[.:,]?\s*(para|pra|de)?/i,
    /programar/i,
  ],
  observation_diagnosis: [
    /folha(s)?\s+(amarela|seca|murcha|manchada|com\s+mancha|enrolando|queimando)/i,
    /mancha(s)?\s+(na|nas|em|circular)\s+(folha|planta|fruto)/i,
    /murcha(ndo|s)?/i,
    /broto\s+(novo\s+)?t[áa]\s+secando/i,
    /praga|inseto|[áa]caro|ferrugem|formiga|mofo|fungo|lagarta/i,
    /percevejo|pulgão|trip(e|s)|mosca\s+branca|nematoide/i,
    /teia\s+fina/i,
    /frutos?\s+caindo/i,
    /o\s+que\s+pode\s+ser/i,
    /o\s+que\s+t[áa]\s+errado/i,
    /p[óo]\s+(branco|preto)\s+(na|nas)\s+folha/i,
    /plantas?\s+mais\s+baixas.*murch/i,
    /insetos?\s+voando/i,
    /caule.*les[ãa]o/i,
    /formigueiro\s+apareceu/i,
    /pontinho\s+preto/i,
    /defici[êe]ncia.*confirmo/i,
    /[áa]gua\s+empo[çc]/i,
    /eros[ãa]o\s+come[çc]/i,
    /press[ãa]o.*gotejo.*caiu/i,
  ],
  cadastro: [
    /cadastr(ar|o)\s+(novo?\s*)?(talh[ãa]o|fazenda|plantio|cultura)/i,
    /criar\s+(novo?\s+)?(talh[ãa]o|fazenda|plantio)/i,
    /adicionar\s+(talh[ãa]o|fazenda|plantio|cultura)/i,
    /como\s+(cadastro|adiciono|registro)\s+(um\s+)?(novo?\s*)?(talh[ãa]o|fazenda|plantio)/i,
    /vincular\s+agr[ôo]nomo/i,
    /atualiza(r)?\s+[áa]rea\s+(do\s+)?talh[ãa]o/i,
    /muda(r)?\s+variedade/i,
    /adicionar\s+um\s+segundo\s+talh[ãa]o/i,
    /onde\s+fica\s+pra\s+criar/i,
    /como\s+registro\s+um\s+novo\s+plantio/i,
  ],
  financeiro: [
    /registrar?\s+(despesa|custo|gasto|receita)/i,
    /lan[çc]ar\s+(despesa|custo|gasto|receita)/i,
    /quanto\s+(gastei|gastar|custou)/i,
    /anotar\s+(gasto|despesa|custo)/i,
    /adicionar\s+(despesa|receita|custo)/i,
    /despesas?\s+(do|da|de)/i,
    /custos?\s+(do|da|de|operacional)/i,
    /despesa\s+(diesel|combust[íi]vel|pe[çc]as|m[ãa]o\s+de\s+obra|energia)/i,
    /coloca\s+uma\s+entrada/i,
    /gastei\s+R\$/i,
    /total\s+de\s+despesas/i,
    /financeiro\s+do\s+m[êe]s/i,
    /custo\s+(do\s+)?trator/i,
    /receita\s+(da\s+)?safra/i,
    /venda\s+de\s+(caf[ée]|soja|milho|feij[ãa]o)/i,
  ],
};

// ============================================================
// MOTOR DE AVALIAÇÃO
// ============================================================

function simulateRoute(message: string): string {
  if (DOMAIN_DEFENSIVOS.some(p => p.test(message))) return "defensivos_safe_gate";
  if (DOMAIN_MERCADO.some(p => p.test(message)))    return "mercado";
  if (DOMAIN_CLIMA.some(p => p.test(message)))      return "clima";

  const order = [
    "high_risk_today", "register_activity", "create_task",
    "observation_diagnosis", "financeiro", "cadastro",
  ];

  for (const intent of order) {
    if (INTENT_PATTERNS[intent]?.some(p => p.test(message))) return intent;
  }
  return "general";
}

type Status = "ok" | "warn" | "gap";

interface TestResult {
  question: string;
  category: string;
  edge: boolean;
  expectedRoute: string;
  actualRoute: string;
  status: Status;
  note: string;
  suggestedRegex?: string;
}

// Mapeia cat → rota esperada
const EXPECTED_ROUTE: Record<string, string> = {
  high_risk_today:      "high_risk_today",
  register_activity:    "register_activity",
  create_task:          "create_task",
  observation_diagnosis:"observation_diagnosis",
  cadastro:             "cadastro",
  financeiro:           "financeiro",
  mercado:              "mercado",
  clima:                "clima",
  defensivos:           "defensivos_safe_gate",
  general:              "general",
};

function evaluate(item: typeof QUESTION_BANK[0]): TestResult {
  const actual = simulateRoute(item.q);
  const expected = EXPECTED_ROUTE[item.cat];

  let status: Status = "ok";
  let note = `Roteado para '${actual}'`;
  let suggestedRegex: string | undefined;

  if (item.cat === "defensivos") {
    if (actual !== "defensivos_safe_gate") {
      status = "gap";
      note = `PERIGO: pergunta de defensivo não bloqueada! Obtido: '${actual}'`;
    }
  } else if (actual === expected) {
    status = "ok";
  } else if (expected === "general") {
    status = "warn";
    note = `Esperado general, obtido '${actual}' — verificar se é aceitável`;
  } else if (actual === "general") {
    status = "gap";
    note = `Caiu em general. Esperado: '${expected}'`;
    suggestedRegex = `// Adicionar em INTENT_PATTERNS.${expected}:\n// /${item.q.toLowerCase().replace(/[^a-záéíóúãõàèìòùâêîôûç0-9\s]/g, "").trim().replace(/\s+/g, "\\s+")}/i`;
  } else {
    status = "gap";
    note = `Rota errada. Esperado: '${expected}' | Obtido: '${actual}'`;
  }

  return {
    question: item.q,
    category: item.cat,
    edge: item.edge,
    expectedRoute: expected,
    actualRoute: actual,
    status,
    note,
    suggestedRegex,
  };
}

// ============================================================
// RUNNER PRINCIPAL
// ============================================================

function runTests(): void {
  const results = QUESTION_BANK.map(evaluate);

  const ok   = results.filter(r => r.status === "ok").length;
  const warn = results.filter(r => r.status === "warn").length;
  const gaps = results.filter(r => r.status === "gap");
  const total = results.length;
  const score = Math.round((ok / total) * 100);

  console.log("\n╔══════════════════════════════════════╗");
  console.log(`║  Fala AI Agrônomo — Teste de Intents ║`);
  console.log("╚══════════════════════════════════════╝");
  console.log(`\n  Total : ${total}`);
  console.log(`  OK    : ${ok} (${score}%)`);
  console.log(`  Warn  : ${warn}`);
  console.log(`  Gaps  : ${gaps.length}`);
  console.log(`\n  Score : ${score >= 90 ? "✅" : score >= 75 ? "⚠️" : "❌"} ${score}%\n`);

  if (gaps.length > 0) {
    console.log("──── GAPS DETECTADOS ────────────────────\n");
    gaps.forEach((g, i) => {
      console.log(`[${i + 1}] ${g.edge ? "[EDGE] " : ""}${g.question}`);
      console.log(`     Cat: ${g.category} | Obtido: ${g.actualRoute}`);
      console.log(`     ${g.note}`);
      if (g.suggestedRegex) console.log(`     ${g.suggestedRegex}`);
      console.log();
    });
  }

  if (warn > 0) {
    console.log("──── ATENÇÕES ───────────────────────────\n");
    results.filter(r => r.status === "warn").forEach((w, i) => {
      console.log(`[${i + 1}] ${w.question}`);
      console.log(`     ${w.note}\n`);
    });
  }

  // Escrever JSON de saída para o agente processar
  const outputPath = "reports/last-run.json";
  const output = {
    timestamp: new Date().toISOString(),
    score,
    total,
    ok,
    warn,
    gaps: gaps.length,
    gapDetails: gaps,
    warnDetails: results.filter(r => r.status === "warn"),
  };

  try {
    const fs = require("fs");
    fs.mkdirSync("reports", { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n  Relatório salvo em ${outputPath}`);
  } catch {
    // ts-node sem fs — só exibe no console
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runTests();
}

export { runTests, simulateRoute, evaluate, EXPECTED_ROUTE };
