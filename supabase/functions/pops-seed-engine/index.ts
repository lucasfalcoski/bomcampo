import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// POP ENGINE: Categories + Micro-POPs
// =============================================

interface PopCategory {
  name: string;
  description: string;
  priority: number;
  keywords: string[];
  icon: string;
}

interface MicroPop {
  category_name: string;
  slug: string;
  title: string;
  triggers: string[];
  crops: string[];
  severity_levels: string[];
  content_markdown: string;
  triage_questions: string[];
  actions: Array<{ type: string; label: string }>;
}

// 12 Categorias com keywords
const CATEGORIES: PopCategory[] = [
  {
    name: "hidrico",
    description: "Manejo de água, irrigação, encharcamento, estresse hídrico",
    priority: 1,
    keywords: ["chuva", "encharcado", "alagado", "seca", "irrigacao", "irrigação", "drenagem", "agua", "água", "estresse hidrico", "molhado", "poça", "umidade"],
    icon: "💧"
  },
  {
    name: "solo",
    description: "Compactação, erosão, estrutura do solo, matéria orgânica",
    priority: 2,
    keywords: ["compactacao", "compactação", "erosao", "erosão", "infiltracao", "infiltração", "estrutura", "materia organica", "solo", "terra", "nutrientes"],
    icon: "🌍"
  },
  {
    name: "nutricao",
    description: "Adubação, calagem, gessagem, deficiências nutricionais",
    priority: 3,
    keywords: ["adubo", "adubacao", "adubação", "calagem", "gessagem", "deficiencia", "deficiência", "foliar", "analise de solo", "nitrogenio", "fosforo", "potassio", "npk", "calcario"],
    icon: "🧪"
  },
  {
    name: "doencas",
    description: "Doenças fúngicas, bacterianas e virais em culturas",
    priority: 4,
    keywords: ["fungo", "mancha", "ferrugem", "mofo", "podridao", "podridão", "necrose", "doenca", "doença", "antracnose", "mildio", "oídio", "bacteriose"],
    icon: "🦠"
  },
  {
    name: "pragas",
    description: "Identificação e manejo de pragas",
    priority: 5,
    keywords: ["lagarta", "percevejo", "broca", "pulgao", "pulgão", "acaro", "ácaro", "praga", "inseto", "trips", "mosca branca", "formiga", "cochonilha"],
    icon: "🐛"
  },
  {
    name: "plantas_daninhas",
    description: "Controle de ervas daninhas e herbicidas",
    priority: 6,
    keywords: ["mato", "invasora", "herbicida", "capina", "planta daninha", "erva daninha", "dessecacao", "dessecação", "pre emergente"],
    icon: "🌿"
  },
  {
    name: "pulverizacao",
    description: "Operações de pulverização, condições climáticas ideais",
    priority: 7,
    keywords: ["vento", "deriva", "chuva pos aplicacao", "temperatura", "umidade", "pulverizacao", "pulverização", "aplicacao", "aplicação", "spray", "calda", "bico"],
    icon: "💨"
  },
  {
    name: "plantio_emergencia",
    description: "Plantio, stand, falhas de germinação, replantio",
    priority: 8,
    keywords: ["stand", "falha", "germinacao", "germinação", "plantio", "emergencia", "emergência", "replantio", "semente", "uniforme"],
    icon: "🌱"
  },
  {
    name: "fenologia_manejo",
    description: "Estágios fenológicos, poda, florada, colheita",
    priority: 9,
    keywords: ["poda", "florada", "enchimento", "graos", "grãos", "maturacao", "maturação", "colheita", "fenologia", "estagio", "estágio", "vegetativo", "reprodutivo"],
    icon: "🌸"
  },
  {
    name: "hortifruti",
    description: "Manejo específico de hortaliças e frutas",
    priority: 10,
    keywords: ["hortalica", "hortaliça", "fruta", "tomate", "alface", "morango", "cenoura", "pos colheita", "pós-colheita", "irrigacao gotejo", "hortifruti"],
    icon: "🥬"
  },
  {
    name: "graos",
    description: "Manejo geral de grãos: soja, milho, feijão, trigo",
    priority: 11,
    keywords: ["soja", "milho", "feijao", "feijão", "trigo", "sorgo", "graos", "grãos", "safrinha", "safra", "silagem"],
    icon: "🌾"
  },
  {
    name: "cafe",
    description: "Manejo específico de café",
    priority: 12,
    keywords: ["cafe", "café", "cafeeiro", "bicho mineiro", "broca do cafe", "cercospora", "phoma", "terreiro", "secagem"],
    icon: "☕"
  },
];

// 36+ Micro-POPs (3 por categoria)
const MICRO_POPS: MicroPop[] = [
  // ========== HÍDRICO (3) ==========
  {
    category_name: "hidrico",
    slug: "encharcamento-talhao",
    title: "Acúmulo de água/encharcamento no talhão",
    triggers: ["encharcado", "alagado", "agua parada", "poça", "alagamento"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Drenagem insuficiente no talhão
- Solo compactado impedindo infiltração
- Chuvas acima da média para o período
- Curvas de nível mal dimensionadas

## Risco se não agir
- Asfixia radicular e morte de plantas
- Aumento de doenças fúngicas (Phytophthora, Fusarium)
- Perda de stand e produtividade

## O que fazer agora (0-24h)
1. **NÃO entre com máquinas** - risco de atolamento e compactação
2. Identifique os pontos mais críticos de acúmulo
3. Verifique se há obstrução em drenos existentes
4. Registre fotos e localização GPS

## O que evitar
- Entrar com máquinas pesadas no talhão
- Ignorar e esperar secar naturalmente (pode piorar)
- Aplicar insumos em área encharcada

## Próximos 7 dias
- Avaliar necessidade de drenos emergenciais
- Monitorar sintomas de asfixia nas plantas
- Consultar agrônomo para plano de manejo

## Perguntas rápidas para confirmar
1. Há quanto tempo está encharcado?
2. Choveu nas últimas 48h? Quanto (mm)?
3. É uma área que sempre alaga ou é novo?`,
    triage_questions: [
      "Há quanto tempo está encharcado?",
      "Choveu nas últimas 48h? Quanto (mm)?",
      "É uma área que sempre alaga ou é novo?"
    ],
    actions: [
      { type: "create_task", label: "Criar tarefa: verificar drenagem" },
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "hidrico",
    slug: "estresse-hidrico-estiagem",
    title: "Estresse hídrico por estiagem",
    triggers: ["seca", "estiagem", "murcha", "folha enrolada", "stress hidrico"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["baixa", "media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Período prolongado sem chuvas
- Irrigação insuficiente ou mal distribuída
- Solo com baixa capacidade de retenção
- Estágio fenológico crítico (florada, enchimento)

## Risco se não agir
- Abortamento de flores e frutos
- Redução drástica de produtividade
- Morte de plantas em casos severos

## O que fazer agora (0-24h)
1. Verifique umidade do solo (10-20cm de profundidade)
2. Priorize irrigação em áreas mais críticas
3. Evite operações que aumentem estresse (poda, adubação)
4. Registre fotos dos sintomas

## O que evitar
- Irrigar em horário de pico solar (10h-15h)
- Aplicar herbicidas em plantas estressadas
- Adubação nitrogenada sem umidade

## Próximos 7 dias
- Monitorar previsão de chuvas
- Ajustar lâmina de irrigação se disponível
- Avaliar uso de mulching/cobertura morta

## Perguntas rápidas para confirmar
1. Há quantos dias sem chuva significativa?
2. A irrigação está funcionando normalmente?
3. Qual o estágio atual da cultura?`,
    triage_questions: [
      "Há quantos dias sem chuva significativa?",
      "A irrigação está funcionando normalmente?",
      "Qual o estágio atual da cultura?"
    ],
    actions: [
      { type: "open_screen", label: "Ver previsão do tempo" },
      { type: "create_task", label: "Criar tarefa: verificar irrigação" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "hidrico",
    slug: "ajuste-irrigacao-semana-seca",
    title: "Irrigação: ajustar lâmina em semana seca",
    triggers: ["irrigacao", "lamina", "semana seca", "gotejo", "aspersao"],
    crops: ["cafe", "hortifruti", "milho", "feijao"],
    severity_levels: ["baixa", "media"],
    content_markdown: `## O que pode ser (hipóteses)
- Necessidade de aumentar frequência/duração
- ETc (evapotranspiração) elevada pela temperatura
- Déficit hídrico acumulado

## Risco se não agir
- Estresse hídrico afetando produtividade
- Queda de flores e frutos
- Redução de qualidade

## O que fazer agora (0-24h)
1. Verifique pressão e vazão do sistema
2. Cheque se há gotejadores/aspersores entupidos
3. Aumente lâmina em 20-30% se necessário
4. Priorize irrigação no início da manhã ou fim de tarde

## O que evitar
- Irrigar ao meio-dia (perda por evaporação)
- Excesso de água (pode causar doenças)
- Ignorar uniformidade de aplicação

## Próximos 7 dias
- Monitorar umidade do solo diariamente
- Ajustar conforme previsão de chuvas
- Verificar funcionamento de filtros

## Perguntas rápidas para confirmar
1. Qual sistema de irrigação você usa?
2. Qual a última vez que checou os filtros?
3. Quanto está irrigando atualmente (mm/dia)?`,
    triage_questions: [
      "Qual sistema de irrigação você usa?",
      "Qual a última vez que checou os filtros?",
      "Quanto está irrigando atualmente (mm/dia)?"
    ],
    actions: [
      { type: "create_task", label: "Criar tarefa: checar irrigação" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== OPERAÇÃO/PULVERIZAÇÃO (3) ==========
  {
    category_name: "pulverizacao",
    slug: "chuva-apos-adubacao",
    title: "Chuva após adubação",
    triggers: ["chuva apos adubacao", "choveu depois de adubar", "adubo molhou"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["baixa", "media"],
    content_markdown: `## O que pode ser (hipóteses)
- Chuva leve favorecendo incorporação
- Chuva forte causando lixiviação
- Arraste superficial do adubo

## Risco se não agir
- Perda de nutrientes (especialmente N e K)
- Desperdício de investimento
- Necessidade de reaplicação

## O que fazer agora (0-24h)
1. Avalie a intensidade da chuva (mm)
2. Observe se houve escorrimento superficial
3. Registre a situação para histórico
4. NÃO reaplicar imediatamente

## O que evitar
- Reaplicar antes de avaliar
- Ignorar totalmente (pode precisar complementar)
- Aplicar novamente em solo saturado

## Próximos 7 dias
- Aguarde 5-7 dias para avaliar resposta das plantas
- Monitore coloração foliar
- Considere análise foliar se sintomas persistirem

## Perguntas rápidas para confirmar
1. Quanto choveu (mm)?
2. Quanto tempo depois da aplicação choveu?
3. Houve escorrimento visível no talhão?`,
    triage_questions: [
      "Quanto choveu (mm)?",
      "Quanto tempo depois da aplicação choveu?",
      "Houve escorrimento visível no talhão?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "create_task", label: "Criar tarefa: avaliar em 7 dias" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "pulverizacao",
    slug: "chuva-apos-pulverizacao",
    title: "Chuva após pulverização",
    triggers: ["chuva apos pulverizacao", "choveu depois de pulverizar", "lavou o produto"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Produto ainda não absorvido (< 30min a 2h)
- Chuva leve - possível eficácia parcial
- Chuva forte - provável lavagem do produto

## Risco se não agir
- Falha no controle da praga/doença
- Resistência por subdose
- Desperdício de produto e tempo

## O que fazer agora (0-24h)
1. Verifique tempo entre aplicação e chuva
2. Consulte bula do produto (tempo de absorção)
3. Registre a ocorrência com detalhes
4. Aguarde antes de reaplicar

## O que evitar
- Reaplicar imediatamente (risco de fitotoxidez)
- Ignorar e assumir que funcionou
- Aplicar dose maior que a recomendada

## Próximos 7 dias
- Monitore a praga/doença alvo
- Avalie necessidade de reaplicação após 3-5 dias
- Consulte agrônomo antes de reaplicar

## Perguntas rápidas para confirmar
1. Quanto tempo depois da aplicação choveu?
2. Qual a intensidade da chuva?
3. Qual produto foi aplicado?`,
    triage_questions: [
      "Quanto tempo depois da aplicação choveu?",
      "Qual a intensidade da chuva?",
      "Qual produto foi aplicado?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "create_task", label: "Monitorar em 3 dias" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "pulverizacao",
    slug: "pulverizacao-com-vento",
    title: "Pulverização com vento/deriva",
    triggers: ["vento forte", "deriva", "pulverizar com vento", "rajada"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Vento acima de 10 km/h durante aplicação
- Inversão térmica (ar parado, névoa)
- Bicos inadequados para condição

## Risco se não agir
- Deriva para áreas vizinhas
- Cobertura inadequada do alvo
- Problemas legais com vizinhos

## O que fazer agora (0-24h)
1. PARE a aplicação se vento > 10 km/h
2. Verifique se houve deriva para áreas vizinhas
3. Aguarde janela mais favorável
4. Considere uso de gotas maiores ou adjuvante

## O que evitar
- Aplicar em condições inadequadas
- Usar bicos de gotas muito finas
- Aplicar próximo a culturas sensíveis

## Próximos 7 dias
- Monitore previsão para janelas de aplicação
- Prefira aplicação no início da manhã ou fim de tarde
- Verifique condições antes de cada aplicação

## Perguntas rápidas para confirmar
1. Qual a velocidade do vento atual (km/h)?
2. Há culturas sensíveis próximas?
3. Qual tipo de bico está usando?`,
    triage_questions: [
      "Qual a velocidade do vento atual (km/h)?",
      "Há culturas sensíveis próximas?",
      "Qual tipo de bico está usando?"
    ],
    actions: [
      { type: "open_screen", label: "Ver clima atual" },
      { type: "open_pop", label: "Ver checklist pré-aplicação" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== CAFÉ (3) ==========
  {
    category_name: "cafe",
    slug: "ferrugem-suspeita-inicial",
    title: "Ferrugem: suspeita inicial",
    triggers: ["ferrugem", "mancha amarela cafe", "po laranja", "pó alaranjado"],
    crops: ["cafe"],
    severity_levels: ["baixa", "media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Ferrugem-do-cafeeiro (Hemileia vastatrix)
- Início de infestação favorecida por umidade
- Esporos trazidos pelo vento de áreas vizinhas

## Risco se não agir
- Desfolha severa
- Redução drástica da produtividade
- Secamento de ramos (em casos graves)

## O que fazer agora (0-24h)
1. Colete folhas com sintomas para confirmação
2. Verifique presença do pó alaranjado na face inferior
3. Avalie % de folhas afetadas (amostragem 30 plantas)
4. Registre fotos e localização

## O que evitar
- Ignorar sintomas iniciais
- Aplicar fungicida sem diagnóstico
- Atrasar muito o início do controle

## Próximos 7 dias
- Envie amostra para confirmação (se dúvida)
- Planeje aplicação preventiva/curativa
- Monitore talhões vizinhos

## Perguntas rápidas para confirmar
1. Há pó alaranjado na face inferior das folhas?
2. Qual % estimado de folhas com sintomas?
3. Quando foi a última aplicação de fungicida?`,
    triage_questions: [
      "Há pó alaranjado na face inferior das folhas?",
      "Qual % estimado de folhas com sintomas?",
      "Quando foi a última aplicação de fungicida?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" },
      { type: "share_whatsapp", label: "Compartilhar no WhatsApp" }
    ]
  },
  {
    category_name: "cafe",
    slug: "bicho-mineiro-suspeita",
    title: "Bicho-mineiro: suspeita",
    triggers: ["bicho mineiro", "mina na folha", "folha minada", "leucoptera"],
    crops: ["cafe"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Bicho-mineiro (Leucoptera coffeella)
- Larva consumindo parênquima foliar
- Favorecido por tempo seco e quente

## Risco se não agir
- Desfolha progressiva
- Redução de fotossíntese
- Queda de produtividade (até 50%)

## O que fazer agora (0-24h)
1. Observe as "minas" nas folhas contra a luz
2. Verifique presença de larvas/pupas
3. Faça amostragem: 30 plantas, 3° ou 4° par de folhas
4. Calcule % de folhas minadas

## O que evitar
- Aplicar inseticida sem atingir nível de controle
- Usar produtos muito agressivos a inimigos naturais
- Ignorar monitoramento contínuo

## Próximos 7 dias
- Se >20-30% de folhas minadas: planejar controle
- Consultar agrônomo para definir produto
- Monitorar semanalmente

## Perguntas rápidas para confirmar
1. Está seco há muitos dias?
2. Qual % de folhas com minas?
3. Vê larvas vivas dentro das minas?`,
    triage_questions: [
      "Está seco há muitos dias?",
      "Qual % de folhas com minas?",
      "Vê larvas vivas dentro das minas?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },
  {
    category_name: "cafe",
    slug: "florada-irregular-avaliar",
    title: "Florada irregular: o que avaliar",
    triggers: ["florada irregular", "florada desuniforme", "cafe nao floriu", "florada atrasada"],
    crops: ["cafe"],
    severity_levels: ["media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Déficit hídrico prolongado antes do estímulo
- Variação de temperatura inadequada
- Nutrição desequilibrada
- Estresse anterior (pragas, doenças)

## Risco se não agir
- Maturação desuniforme
- Dificuldade na colheita
- Queda de qualidade do café

## O que fazer agora (0-24h)
1. Avalie % de plantas que floraram vs não floraram
2. Verifique histórico de irrigação/chuvas
3. Observe condições das plantas (vigor, folhas)
4. Registre a situação

## O que evitar
- Tentar forçar florada com irrigação excessiva
- Ignorar plantas que não floraram
- Aplicar hormônios sem orientação

## Próximos 7 dias
- Aguarde possível 2ª florada
- Planeje manejo diferenciado se necessário
- Consulte agrônomo para diagnóstico

## Perguntas rápidas para confirmar
1. Qual % das plantas florou?
2. Houve chuva/irrigação antes da florada esperada?
3. As plantas têm bom vigor e folhagem?`,
    triage_questions: [
      "Qual % das plantas florou?",
      "Houve chuva/irrigação antes da florada esperada?",
      "As plantas têm bom vigor e folhagem?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== SOJA (3) ==========
  {
    category_name: "graos",
    slug: "percevejo-suspeita-soja",
    title: "Percevejo: suspeita (soja)",
    triggers: ["percevejo", "percevejo marrom", "percevejo verde", "cheiro forte"],
    crops: ["soja"],
    severity_levels: ["baixa", "media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Percevejo-marrom (Euschistus heros)
- Percevejo-verde (Nezara viridula)
- Percevejo-verde-pequeno (Piezodorus guildinii)

## Risco se não agir
- Chochamento de grãos
- Retenção foliar
- Perda de peso e qualidade

## O que fazer agora (0-24h)
1. Faça amostragem com pano-de-batida
2. Conte percevejos maiores que 0,5cm
3. Anote nível: média por amostragem
4. Identifique espécie predominante

## O que evitar
- Aplicar antes de atingir nível de controle
- Usar apenas piretróides (resistência)
- Ignorar áreas de borda

## Próximos 7 dias
- Nível de ação: 2 percevejos/m (grão) ou 1/m (semente)
- Se atingiu: planejar aplicação
- Rotacionar grupos químicos

## Perguntas rápidas para confirmar
1. Qual estágio da soja (R1, R3, R5...)?
2. Quantos percevejos por amostragem?
3. Já aplicou inseticida nesta safra?`,
    triage_questions: [
      "Qual estágio da soja (R1, R3, R5...)?",
      "Quantos percevejos por amostragem?",
      "Já aplicou inseticida nesta safra?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },
  {
    category_name: "graos",
    slug: "mancha-foliar-suspeita-soja",
    title: "Mancha foliar: suspeita (soja)",
    triggers: ["mancha soja", "folha manchada soja", "doenca foliar soja"],
    crops: ["soja"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Ferrugem asiática (Phakopsora pachyrhizi)
- Mancha-alvo (Corynespora cassiicola)
- Antracnose (Colletotrichum spp.)
- Septoriose / Cercospora

## Risco se não agir
- Desfolha precoce
- Redução de enchimento de grãos
- Perda significativa de produtividade

## O que fazer agora (0-24h)
1. Colete folhas com sintomas (terço inferior)
2. Observe padrão: circular, angular, com halo?
3. Verifique face inferior (esporos/pústulas)
4. Registre fotos em alta qualidade

## O que evitar
- Autodiagnóstico sem confirmação
- Aplicar fungicida errado para a doença
- Atrasar muito o controle se for ferrugem

## Próximos 7 dias
- Envie material para laboratório se dúvida
- Monitore evolução dos sintomas
- Planeje controle com agrônomo

## Perguntas rápidas para confirmar
1. As manchas são circulares ou angulares?
2. Há pústulas (pequenas bolhas) na face inferior?
3. Qual estágio da cultura?`,
    triage_questions: [
      "As manchas são circulares ou angulares?",
      "Há pústulas (pequenas bolhas) na face inferior?",
      "Qual estágio da cultura?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },
  {
    category_name: "plantio_emergencia",
    slug: "falha-stand-soja",
    title: "Falha de stand (soja/milho)",
    triggers: ["falha stand", "plantas faltando", "germinacao ruim", "stand desuniforme"],
    crops: ["soja", "milho"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Qualidade de semente baixa
- Profundidade de plantio inadequada
- Ataque de pragas de solo
- Compactação/solo inadequado

## Risco se não agir
- Redução de produtividade proporcional
- Maior competição com daninhas
- Custo de replantio (se muito grave)

## O que fazer agora (0-24h)
1. Faça contagem de plantas em 10m lineares
2. Compare com população desejada
3. Observe plantas faltantes: há semente? Está podre?
4. Procure sinais de pragas (lagarta-rosca, corós)

## O que evitar
- Replantar sem avaliar causa
- Ignorar falhas localizadas
- Aumentar adubação para "compensar"

## Próximos 7 dias
- Calcule % de falha real
- Avalie viabilidade de replantio parcial
- Consulte agrônomo para decisão

## Perguntas rápidas para confirmar
1. Qual % estimado de falha?
2. É uniforme ou em reboleiras?
3. Encontrou sementes podres/danificadas?`,
    triage_questions: [
      "Qual % estimado de falha?",
      "É uniforme ou em reboleiras?",
      "Encontrou sementes podres/danificadas?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== MILHO (3) ==========
  {
    category_name: "pragas",
    slug: "lagarta-cartucho-suspeita",
    title: "Lagarta do cartucho: suspeita (milho)",
    triggers: ["lagarta cartucho", "spodoptera", "milho furado", "cartucho raspado"],
    crops: ["milho"],
    severity_levels: ["baixa", "media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Lagarta-do-cartucho (Spodoptera frugiperda)
- Fase inicial: raspagem de folhas
- Fase avançada: perfuração do cartucho

## Risco se não agir
- Destruição do ponto de crescimento
- Perda total da planta (casos severos)
- Redução de produtividade

## O que fazer agora (0-24h)
1. Abra cartuchos para verificar presença
2. Observe excrementos (fezes) no cartucho
3. Faça amostragem: 20 plantas em 5 pontos
4. Anote % de plantas com lagarta viva

## O que evitar
- Aplicar sem verificar presença real
- Usar apenas um grupo químico
- Aplicar em horário quente (lagarta dentro do cartucho)

## Próximos 7 dias
- Nível de ação: 20% de plantas com lagarta viva
- Preferir aplicação à tarde/noite
- Usar gotas médias que penetrem no cartucho

## Perguntas rápidas para confirmar
1. Qual estágio do milho (V2, V4, V6...)?
2. Vê lagartas vivas dentro do cartucho?
3. Qual % de plantas atacadas?`,
    triage_questions: [
      "Qual estágio do milho (V2, V4, V6...)?",
      "Vê lagartas vivas dentro do cartucho?",
      "Qual % de plantas atacadas?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },
  {
    category_name: "hidrico",
    slug: "estresse-hidrico-milho-v4v8",
    title: "Estresse hídrico em V4-V8 (milho)",
    triggers: ["milho murcho", "milho enrolado", "stress v4", "stress v8"],
    crops: ["milho"],
    severity_levels: ["media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Déficit hídrico em fase crítica
- Definição de potencial produtivo comprometida
- Solo com baixa retenção de água

## Risco se não agir
- Redução do número de fileiras na espiga
- Menor potencial de grãos por espiga
- Perda irreversível de produtividade

## O que fazer agora (0-24h)
1. Verifique umidade do solo (20cm)
2. Observe enrolamento de folhas (sintoma clássico)
3. Se tem irrigação: priorize esta área
4. Registre a situação

## O que evitar
- Adubação nitrogenada sem umidade
- Aplicação de herbicidas em estresse
- Ignorar - fase crítica para definição produtiva

## Próximos 7 dias
- Monitore previsão de chuvas
- Irrigue se possível (15-20mm)
- Avalie impacto após recuperação

## Perguntas rápidas para confirmar
1. Folhas estão enroladas ("canudo")?
2. Há quanto tempo sem chuva/irrigação?
3. Qual estágio exato (V4, V6, V8)?`,
    triage_questions: [
      "Folhas estão enroladas ('canudo')?",
      "Há quanto tempo sem chuva/irrigação?",
      "Qual estágio exato (V4, V6, V8)?"
    ],
    actions: [
      { type: "open_screen", label: "Ver previsão do tempo" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "nutricao",
    slug: "deficiencia-nitrogenio-milho",
    title: "Deficiência de N (milho)",
    triggers: ["milho amarelo", "folha velha amarela", "deficiencia nitrogenio", "falta de n"],
    crops: ["milho"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Falta de adubação nitrogenada
- Lixiviação por chuvas intensas
- Baixa mineralização de matéria orgânica
- Problema na aplicação anterior

## Risco se não agir
- Plantas raquíticas e amareladas
- Espigas pequenas e mal granadas
- Perda significativa de produtividade

## O que fazer agora (0-24h)
1. Observe padrão: amarelecimento em "V" nas folhas velhas
2. Compare plantas de diferentes áreas
3. Verifique histórico de adubação
4. Registre fotos

## O que evitar
- Aplicar N sem umidade no solo
- Aplicar ureia a lanço em tempo quente/seco
- Doses muito altas de uma vez

## Próximos 7 dias
- Planejar cobertura nitrogenada
- Preferir aplicação com previsão de chuva
- Considerar fontes protegidas

## Perguntas rápidas para confirmar
1. O amarelecimento começa nas folhas mais velhas?
2. Fez adubação de cobertura?
3. Choveu muito após a última aplicação?`,
    triage_questions: [
      "O amarelecimento começa nas folhas mais velhas?",
      "Fez adubação de cobertura?",
      "Choveu muito após a última aplicação?"
    ],
    actions: [
      { type: "create_task", label: "Planejar adubação de cobertura" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== HORTIFRUTI (3) ==========
  {
    category_name: "hortifruti",
    slug: "murcha-hortalicas",
    title: "Murcha em hortaliças (irrigação/doença)",
    triggers: ["hortalica murcha", "alface murcha", "tomate murcho", "murcha horta"],
    crops: ["hortifruti"],
    severity_levels: ["media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Déficit hídrico (irrigação insuficiente)
- Murcha bacteriana (Ralstonia)
- Murcha de Fusarium
- Nematoides

## Risco se não agir
- Morte das plantas
- Perda total da produção
- Contaminação de áreas vizinhas (se doença)

## O que fazer agora (0-24h)
1. Verifique se o solo está úmido
2. Observe: murcha permanente ou só no calor?
3. Corte o caule e veja se há escurecimento interno
4. Isole plantas suspeitas

## O que evitar
- Aumentar irrigação sem diagnóstico
- Transplantar para mesma área se for doença
- Ignorar padrão de dispersão

## Próximos 7 dias
- Se murcha permanente: suspeitar de doença
- Enviar amostra para laboratório
- Planejar manejo preventivo

## Perguntas rápidas para confirmar
1. A murcha recupera à noite/manhã?
2. O caule tem escurecimento interno?
3. Outras plantas próximas também murcham?`,
    triage_questions: [
      "A murcha recupera à noite/manhã?",
      "O caule tem escurecimento interno?",
      "Outras plantas próximas também murcham?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "hortifruti",
    slug: "manchas-folhas-hf",
    title: "Manchas em folhas (fungo/bactéria) - HF",
    triggers: ["mancha folha horta", "folha manchada hortalica", "doenca foliar hf"],
    crops: ["hortifruti"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Doenças fúngicas (Alternaria, Cercospora)
- Bacterioses (Xanthomonas, Pseudomonas)
- Deficiências nutricionais
- Fitotoxidez

## Risco se não agir
- Desfolha e perda de qualidade
- Expansão para outras plantas
- Produto não comercializável

## O que fazer agora (0-24h)
1. Observe padrão: manchas regulares ou irregulares?
2. Há halo amarelo ao redor?
3. Manchas são secas ou "molhadas"?
4. Colete amostras em saco plástico

## O que evitar
- Molhar folhas na irrigação
- Aplicar fungicida em bacteriose
- Trabalhar na área com plantas molhadas

## Próximos 7 dias
- Reduza irrigação por aspersão
- Prefira irrigação por gotejamento
- Consulte agrônomo para diagnóstico

## Perguntas rápidas para confirmar
1. As manchas têm bordas definidas ou difusas?
2. Há presença de halos amarelados?
3. A irrigação é por aspersão?`,
    triage_questions: [
      "As manchas têm bordas definidas ou difusas?",
      "Há presença de halos amarelados?",
      "A irrigação é por aspersão?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "pragas",
    slug: "pragas-sugadoras-hf",
    title: "Pragas sugadoras (pulgão/mosca-branca) - HF",
    triggers: ["pulgao", "mosca branca", "melado", "fumagina", "praga sugadora"],
    crops: ["hortifruti", "soja", "feijao"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Pulgões (várias espécies)
- Mosca-branca (Bemisia tabaci)
- Tripes
- Cochonilhas

## Risco se não agir
- Transmissão de vírus
- Fumagina (fungo preto sobre melado)
- Deformação de brotos e folhas

## O que fazer agora (0-24h)
1. Observe face inferior das folhas
2. Procure por melado (líquido pegajoso)
3. Verifique presença de fumagina (preto)
4. Faça contagem aproximada

## O que evitar
- Usar apenas piretróides (resistência)
- Aplicar em altas temperaturas
- Ignorar focos iniciais

## Próximos 7 dias
- Monitore expansão da infestação
- Considere controle biológico se disponível
- Planeje rotação de princípios ativos

## Perguntas rápidas para confirmar
1. Vê pequenos insetos na face inferior?
2. Há substância pegajosa (melado) nas folhas?
3. Folhas novas estão deformadas?`,
    triage_questions: [
      "Vê pequenos insetos na face inferior?",
      "Há substância pegajosa (melado) nas folhas?",
      "Folhas novas estão deformadas?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },

  // ========== SOLO (3) ==========
  {
    category_name: "solo",
    slug: "compactacao-solo",
    title: "Compactação de solo",
    triggers: ["solo duro", "compactacao", "pe de grade", "raiz torta"],
    crops: ["cafe", "soja", "milho", "feijao"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Tráfego excessivo de máquinas
- Preparo em umidade inadequada
- Camada compactada subsuperficial ("pé de grade")

## Risco se não agir
- Raízes superficiais e deformadas
- Menor absorção de água e nutrientes
- Redução de produtividade

## O que fazer agora (0-24h)
1. Faça teste com penetrômetro ou barra de ferro
2. Cave trincheira e observe perfil do solo
3. Verifique formato das raízes
4. Registre profundidade da camada dura

## O que evitar
- Subsolagem em solo muito seco ou muito úmido
- Gradear repetidamente na mesma profundidade
- Tráfego em solo molhado

## Próximos 7 dias
- Planeje descompactação para época adequada
- Considere plantas de cobertura com raiz profunda
- Consulte agrônomo para recomendação

## Perguntas rápidas para confirmar
1. A que profundidade encontra resistência?
2. As raízes crescem horizontalmente?
3. Qual histórico de preparo da área?`,
    triage_questions: [
      "A que profundidade encontra resistência?",
      "As raízes crescem horizontalmente?",
      "Qual histórico de preparo da área?"
    ],
    actions: [
      { type: "create_task", label: "Planejar descompactação" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "solo",
    slug: "erosao-laminar",
    title: "Erosão laminar/sulcos",
    triggers: ["erosao", "sulco", "terra lavada", "solo exposto"],
    crops: ["cafe", "soja", "milho"],
    severity_levels: ["media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Chuvas intensas em solo descoberto
- Curvas de nível inexistentes ou mal feitas
- Terraços rompidos
- Ausência de cobertura vegetal

## Risco se não agir
- Perda de solo fértil
- Assoreamento de córregos/barragens
- Formação de voçorocas

## O que fazer agora (0-24h)
1. Identifique origem do escorrimento
2. Verifique se há terraços rompidos
3. Fotografe e marque os pontos críticos
4. Evite tráfego na área afetada

## O que evitar
- Gradear solo descoberto antes de chuvas
- Ignorar pequenos sulcos (aumentam rápido)
- Plantar morro abaixo

## Próximos 7 dias
- Planeje reparo de terraços
- Considere cobertura morta emergencial
- Consulte técnico para curvas de nível

## Perguntas rápidas para confirmar
1. Há terraços na área? Estão funcionando?
2. O solo está descoberto?
3. Choveu forte recentemente?`,
    triage_questions: [
      "Há terraços na área? Estão funcionando?",
      "O solo está descoberto?",
      "Choveu forte recentemente?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "create_task", label: "Planejar correção" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },
  {
    category_name: "nutricao",
    slug: "interpretacao-analise-solo",
    title: "Interpretação de análise de solo",
    triggers: ["analise de solo", "resultado analise", "laudo solo", "ph baixo"],
    crops: ["cafe", "soja", "milho", "feijao", "hortifruti"],
    severity_levels: ["baixa", "media"],
    content_markdown: `## O que pode ser (hipóteses)
- Necessidade de calagem (pH baixo)
- Necessidade de gessagem (Ca/Mg baixos em profundidade)
- Desequilíbrio de nutrientes
- Deficiência ou excesso específico

## Risco se não agir
- Baixa eficiência da adubação
- Toxidez de alumínio
- Deficiências induzidas

## O que fazer agora (0-24h)
1. Verifique pH, V%, CTC, teores de nutrientes
2. Compare com níveis críticos para sua cultura
3. Anote pontos de atenção
4. Organize dados por talhão

## O que evitar
- Aplicar corretivos sem cálculo técnico
- Ignorar relações entre nutrientes (Ca/Mg/K)
- Usar recomendações genéricas

## Próximos 7 dias
- Solicite recomendação técnica ao agrônomo
- Planeje época de aplicação de calcário/gesso
- Organize compra de insumos

## Perguntas rápidas para confirmar
1. Qual o pH atual?
2. Qual a saturação por bases (V%)?
3. Há quanto tempo coletou a amostra?`,
    triage_questions: [
      "Qual o pH atual?",
      "Qual a saturação por bases (V%)?",
      "Há quanto tempo coletou a amostra?"
    ],
    actions: [
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" },
      { type: "share_whatsapp", label: "Compartilhar no WhatsApp" }
    ]
  },

  // ========== DOENÇAS (adicionais) ==========
  {
    category_name: "doencas",
    slug: "podridao-radicular",
    title: "Podridão radicular",
    triggers: ["raiz podre", "podridao raiz", "phytophthora", "fusarium"],
    crops: ["cafe", "soja", "feijao", "hortifruti"],
    severity_levels: ["media", "alta", "critica"],
    content_markdown: `## O que pode ser (hipóteses)
- Phytophthora spp.
- Fusarium spp.
- Rhizoctonia spp.
- Excesso de umidade no solo

## Risco se não agir
- Morte progressiva de plantas
- Contaminação de plantas vizinhas
- Perda significativa de stand

## O que fazer agora (0-24h)
1. Arranque plantas sintomáticas e observe raízes
2. Verifique coloração interna do caule/raiz
3. Observe padrão: reboleiras ou aleatório?
4. Registre fotos e localização

## O que evitar
- Irrigar excessivamente
- Transplantar mudas saudáveis na mesma cova
- Ignorar drenagem da área

## Próximos 7 dias
- Envie material para laboratório
- Melhore drenagem se possível
- Isole área afetada

## Perguntas rápidas para confirmar
1. As raízes estão escuras/podres?
2. A área fica encharcada?
3. Plantas em reboleira ou espalhadas?`,
    triage_questions: [
      "As raízes estão escuras/podres?",
      "A área fica encharcada?",
      "Plantas em reboleira ou espalhadas?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  },

  // ========== PLANTAS DANINHAS ==========
  {
    category_name: "plantas_daninhas",
    slug: "infestacao-daninhas",
    title: "Infestação de plantas daninhas",
    triggers: ["mato alto", "invasora", "capim", "erva daninha", "tiririca"],
    crops: ["cafe", "soja", "milho", "feijao"],
    severity_levels: ["baixa", "media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Falha no controle pré-emergente
- Resistência a herbicidas
- Janela de aplicação perdida
- Reinfestação por sementes do banco

## Risco se não agir
- Competição por água, luz e nutrientes
- Redução de produtividade
- Aumento do banco de sementes

## O que fazer agora (0-24h)
1. Identifique as principais espécies
2. Avalie estágio das plantas daninhas
3. Observe se há padrões (manchas, linhas)
4. Registre a situação

## O que evitar
- Aplicar herbicidas em plantas muito desenvolvidas
- Usar sempre o mesmo princípio ativo
- Ignorar pequenos focos

## Próximos 7 dias
- Planeje controle adequado ao estágio
- Considere controle mecânico se necessário
- Consulte agrônomo para recomendação

## Perguntas rápidas para confirmar
1. Quais as principais espécies presentes?
2. Qual o tamanho/estágio das plantas daninhas?
3. Qual herbicida foi usado no pré?`,
    triage_questions: [
      "Quais as principais espécies presentes?",
      "Qual o tamanho/estágio das plantas daninhas?",
      "Qual herbicida foi usado no pré?"
    ],
    actions: [
      { type: "create_occurrence", label: "Registrar ocorrência" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo RT" }
    ]
  },

  // ========== FENOLOGIA ==========
  {
    category_name: "fenologia_manejo",
    slug: "colheita-ponto-ideal",
    title: "Colheita: avaliar ponto ideal",
    triggers: ["hora de colher", "ponto de colheita", "maturacao", "umidade grao"],
    crops: ["cafe", "soja", "milho", "feijao"],
    severity_levels: ["media", "alta"],
    content_markdown: `## O que pode ser (hipóteses)
- Umidade ainda elevada
- Maturação desuniforme
- Ponto ideal já passou

## Risco se não agir
- Perdas por debulha natural
- Perdas por condições climáticas
- Qualidade inferior do produto

## O que fazer agora (0-24h)
1. Faça teste de umidade em amostras
2. Avalie uniformidade de maturação
3. Verifique previsão do tempo
4. Registre umidade atual

## O que evitar
- Colher com umidade muito alta (custos de secagem)
- Atrasar muito (perdas de qualidade)
- Colher em condições úmidas (compactação)

## Próximos 7 dias
- Monitore evolução da umidade
- Planeje logística de colheita/secagem
- Defina prioridade entre talhões

## Perguntas rápidas para confirmar
1. Qual a umidade atual dos grãos?
2. A maturação está uniforme?
3. Qual a previsão de chuva?`,
    triage_questions: [
      "Qual a umidade atual dos grãos?",
      "A maturação está uniforme?",
      "Qual a previsão de chuva?"
    ],
    actions: [
      { type: "open_screen", label: "Ver previsão do tempo" },
      { type: "escalate_to_agronomist", label: "Consultar agrônomo" }
    ]
  }
];

// =============================================
// Main Handler
// =============================================
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify user is superadmin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: roleData } = await supabase
      .from("user_system_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Superadmin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Insert/Update categories
    const categoryMap: Record<string, string> = {};
    let categoriesInserted = 0;
    let categoriesUpdated = 0;

    for (const cat of CATEGORIES) {
      const { data: existing } = await supabase
        .from("pop_categories")
        .select("id")
        .eq("name", cat.name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("pop_categories")
          .update({
            description: cat.description,
            priority: cat.priority,
            keywords: cat.keywords,
            icon: cat.icon,
          })
          .eq("id", existing.id);
        categoryMap[cat.name] = existing.id;
        categoriesUpdated++;
      } else {
        const { data: newCat } = await supabase
          .from("pop_categories")
          .insert({
            name: cat.name,
            description: cat.description,
            priority: cat.priority,
            keywords: cat.keywords,
            icon: cat.icon,
          })
          .select("id")
          .single();
        
        if (newCat) {
          categoryMap[cat.name] = newCat.id;
          categoriesInserted++;
        }
      }
    }

    // 2. Insert/Update micro-POPs
    let popsInserted = 0;
    let popsUpdated = 0;

    for (const pop of MICRO_POPS) {
      const categoryId = categoryMap[pop.category_name];
      
      const { data: existing } = await supabase
        .from("pops")
        .select("id")
        .eq("slug", pop.slug)
        .is("workspace_id", null)
        .maybeSingle();

      const popData = {
        slug: pop.slug,
        title: pop.title,
        category: pop.category_name,
        category_id: categoryId,
        summary: pop.content_markdown.split("\n").slice(0, 3).join(" ").substring(0, 200),
        keywords: pop.triggers,
        triggers: pop.triggers,
        crops: pop.crops,
        severity_levels: pop.severity_levels,
        content_markdown: pop.content_markdown,
        triage_questions: pop.triage_questions,
        actions: pop.actions,
        is_active: true,
        workspace_id: null,
      };

      if (existing) {
        await supabase
          .from("pops")
          .update(popData)
          .eq("id", existing.id);
        popsUpdated++;
      } else {
        await supabase
          .from("pops")
          .insert(popData);
        popsInserted++;
      }
    }

    // 3. Log the action
    await supabase.from("admin_audit_log").insert({
      admin_user_id: user.id,
      action: "pops_seed_engine",
      target_type: "pops",
      metadata: {
        categories_inserted: categoriesInserted,
        categories_updated: categoriesUpdated,
        pops_inserted: popsInserted,
        pops_updated: popsUpdated,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `POP Engine seeded successfully`,
        categories: {
          inserted: categoriesInserted,
          updated: categoriesUpdated,
          total: CATEGORIES.length,
        },
        pops: {
          inserted: popsInserted,
          updated: popsUpdated,
          total: MICRO_POPS.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in pops-seed-engine:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});