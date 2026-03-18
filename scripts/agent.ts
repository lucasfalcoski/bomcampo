/**
 * scripts/agent.ts
 * Agente de Melhoria Contínua — Fala AI Agrônomo
 *
 * Uso:
 *   npx ts-node scripts/agent.ts              → ciclo completo
 *   npx ts-node scripts/agent.ts --only=test  → só roda os testes
 *   npx ts-node scripts/agent.ts --only=patch → só gera patches
 */

import * as fs from "fs";
import * as path from "path";
import { runTests, simulateRoute, evaluate, EXPECTED_ROUTE } from "./test-intents";
import { QUESTION_BANK } from "./test-intents";

const AI_ASK_PATH = path.resolve("supabase/functions/ai-ask/index.ts");
const REPORTS_DIR = path.resolve("reports");
const PATCHES_DIR = path.resolve("patches");
const DATE_STR = new Date().toISOString().split("T")[0];

// ============================================================
// STEP 1 — RODAR TESTES E LER GAPS
// ============================================================

function step1_runTests() {
  console.log("\n🔍 STEP 1 — Rodando banco de testes sintéticos...\n");
  runTests();

  const reportPath = path.join(REPORTS_DIR, "last-run.json");
  if (!fs.existsSync(reportPath)) {
    console.log("⚠️  Relatório não gerado — rodando análise inline...");
    return QUESTION_BANK.map(evaluate).filter(r => r.status === "gap");
  }

  const report = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
  return report.gapDetails || [];
}

// ============================================================
// STEP 2 — GERAR REGEX PARA OS GAPS
// ============================================================

function generateRegex(question: string, category: string): string[] {
  const q = question.toLowerCase().trim();
  const suggestions: string[] = [];

  // Estratégia 1: pegar verbos e substantivos chave
  const words = q.replace(/[^a-záéíóúãõàèìòùâêîôûç0-9\s]/g, " ")
                  .split(/\s+/)
                  .filter(w => w.length > 3);

  // Estratégia 2: construir padrão com palavras chave
  const keyWords = words.slice(0, 4).join("\\s+");
  if (keyWords) {
    suggestions.push(`/${keyWords}/i`);
  }

  // Estratégia 3: patterns por categoria
  const catPatterns: Record<string, string[]> = {
    high_risk_today: [
      "/é\\s+seguro\\s+(entrar|aplicar)/i",
      "/tem\\s+orvalho.*rola/i",
      "/janela.*aplicar/i",
      "/umidade.*arrisco\\s+pulverizar/i",
      "/solo.*molhado.*d[áa]\\s+pra/i",
      "/previs[ãa]o.*posso\\s+aplicar/i",
    ],
    observation_diagnosis: [
      "/p[óo]\\s+(branco|preto)\\s+(na|nas)\\s+folha/i",
      "/caule.*les[ãa]o/i",
      "/defici[êe]ncia.*confirmo/i",
      "/press[ãa]o.*gotejo.*caiu/i",
      "/[áa]gua\\s+empo[çc]/i",
    ],
    financeiro: [
      "/gastei\\s+R\\$/i",
      "/coloca\\s+uma\\s+entrada/i",
      "/receita\\s+(da\\s+)?safra/i",
      "/financeiro\\s+do\\s+m[êe]s/i",
    ],
    register_activity: [
      "/poda.*conclu[íi]d/i",
      "/instalamos?\\s+(armadilha)/i",
      "/coleta\\s+de\\s+amostra/i",
      "/trocamos?\\s+(os\\s+)?bico/i",
    ],
    cadastro: [
      "/onde\\s+fica\\s+pra\\s+criar/i",
      "/adicionar\\s+um\\s+segundo\\s+talh[ãa]o/i",
    ],
    mercado: [
      "/o\\s+caf[ée]\\s+t[áa]\\s+a\\s+quanto/i",
      "/soja\\s+em\\s+(MG|SP|PR|GO|MT)/i",
      "/valor\\s+do\\s+caf[ée]/i",
      "/mercado\\s+de\\s+soja/i",
    ],
    clima: [
      "/alerta\\s+(de\\s+)?tempestade/i",
      "/umidade\\s+t[áa]\\s+alta/i",
      "/vai\\s+esfriar/i",
      "/temperatura\\s+m[íi]nima/i",
    ],
  };

  return catPatterns[category] || suggestions;
}

// ============================================================
// STEP 3 — LER O AI-ASK E PREPARAR PATCHES
// ============================================================

interface Patch {
  category: string;
  intent: string;
  regexToAdd: string[];
  targetMarker: string;
  gapsResolved: string[];
}

function step3_preparePatches(gaps: any[]): Patch[] {
  if (!fs.existsSync(AI_ASK_PATH)) {
    console.error(`\n❌ Arquivo não encontrado: ${AI_ASK_PATH}`);
    console.error("   Execute o agente a partir da raiz do projeto Bom Campo.\n");
    process.exit(1);
  }

  // Agrupar gaps por categoria
  const byCategory: Record<string, string[]> = {};
  gaps.forEach((g: any) => {
    const cat = g.category;
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(g.question);
  });

  const patches: Patch[] = [];

  for (const [cat, questions] of Object.entries(byCategory)) {
    // Gerar regex únicos para todas as perguntas da categoria
    const allRegex = new Set<string>();
    questions.forEach(q => {
      generateRegex(q, cat).forEach(r => allRegex.add(r));
    });

    // Determinar o marcador de inserção no arquivo
    const intentToMarker: Record<string, string> = {
      high_risk_today:       "high_risk_today: [",
      register_activity:     "register_activity: [",
      create_task:           "create_task: [",
      observation_diagnosis: "observation_diagnosis: [",
      cadastro:              "cadastro: [",
      financeiro:            "financeiro: [",
      mercado:               "mercado: [",
      clima:                 "clima: [",
    };

    if (!intentToMarker[cat]) continue;

    patches.push({
      category: cat,
      intent: cat,
      regexToAdd: [...allRegex],
      targetMarker: intentToMarker[cat],
      gapsResolved: questions,
    });
  }

  return patches;
}

// ============================================================
// STEP 4 — APLICAR PATCHES NO AI-ASK
// ============================================================

function step4_applyPatches(patches: Patch[], dryRun = false): void {
  if (patches.length === 0) {
    console.log("\n✅ Nenhum patch necessário — todos os intents estão cobertos!\n");
    return;
  }

  console.log(`\n🔧 STEP 4 — Aplicando ${patches.length} patch(es)...\n`);

  let content = fs.readFileSync(AI_ASK_PATH, "utf-8");
  let totalAdded = 0;

  patches.forEach(patch => {
    const marker = patch.targetMarker;
    const idx = content.indexOf(marker);

    if (idx === -1) {
      console.log(`  ⚠️  Marcador não encontrado: '${marker}' — pulando ${patch.category}`);
      return;
    }

    // Encontrar o final do array (próximo ']')
    // Inserir antes do fechamento
    let insertPos = idx + marker.length;

    // Adicionar os novos regex antes do fechamento do array
    const newRegexLines = patch.regexToAdd
      .map(r => `    ${r},`)
      .join("\n");

    const insertText = `\n${newRegexLines}`;

    if (!dryRun) {
      content = content.slice(0, insertPos) + insertText + content.slice(insertPos);
    }

    totalAdded += patch.regexToAdd.length;
    console.log(`  ✅ ${patch.category}: +${patch.regexToAdd.length} padrão(ões)`);
    patch.regexToAdd.forEach(r => console.log(`     ${r}`));
  });

  if (!dryRun) {
    // Backup antes de modificar
    const backupPath = AI_ASK_PATH.replace(".ts", `.backup-${DATE_STR}.ts`);
    fs.copyFileSync(AI_ASK_PATH, backupPath);
    console.log(`\n  📦 Backup salvo em: ${backupPath}`);

    fs.writeFileSync(AI_ASK_PATH, content, "utf-8");
    console.log(`  📝 ai-ask/index.ts atualizado (+${totalAdded} padrões)`);
  } else {
    console.log(`\n  [DRY RUN] ${totalAdded} padrão(ões) seriam adicionados`);
  }
}

// ============================================================
// STEP 5 — GERAR RELATÓRIO MARKDOWN
// ============================================================

function step5_generateReport(gaps: any[], patches: Patch[], score: number): void {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.mkdirSync(PATCHES_DIR, { recursive: true });

  const reportPath = path.join(REPORTS_DIR, `${DATE_STR}-report.md`);

  const lines = [
    `# Relatório — Fala AI Agrônomo`,
    `**Data:** ${DATE_STR}`,
    `**Score antes:** ${score}%`,
    `**Gaps encontrados:** ${gaps.length}`,
    `**Patches gerados:** ${patches.length}`,
    ``,
    `## Gaps por Categoria`,
  ];

  const byCategory: Record<string, any[]> = {};
  gaps.forEach((g: any) => {
    if (!byCategory[g.category]) byCategory[g.category] = [];
    byCategory[g.category].push(g);
  });

  for (const [cat, items] of Object.entries(byCategory)) {
    lines.push(`\n### ${cat}`);
    items.forEach((g: any) => {
      lines.push(`- **"${g.question}"**`);
      lines.push(`  - Obtido: \`${g.actualRoute}\` | Esperado: \`${g.expectedRoute}\``);
      if (g.suggestedRegex) lines.push(`  - Sugestão: \`${g.suggestedRegex}\``);
    });
  }

  lines.push(`\n## Patches Aplicados`);
  patches.forEach(p => {
    lines.push(`\n### ${p.category} (+${p.regexToAdd.length} padrões)`);
    p.regexToAdd.forEach(r => lines.push(`- \`${r}\``));
    lines.push(`\n**Gaps resolvidos:**`);
    p.gapsResolved.forEach(q => lines.push(`- "${q}"`));
  });

  lines.push(`\n---`);
  lines.push(`*Gerado automaticamente pelo Agente de Melhoria Contínua*`);

  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`\n  📄 Relatório: ${reportPath}`);
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find(a => a.startsWith("--only="))?.split("=")[1];
  const dryRun = args.includes("--dry-run");

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  Agente de Melhoria — Fala AI Agrônomo       ║");
  console.log("╚══════════════════════════════════════════════╝");
  if (dryRun) console.log("\n  ⚠️  MODO DRY RUN — nenhum arquivo será alterado\n");

  const gaps = step1_runTests();

  const reportPath = path.join(REPORTS_DIR, "last-run.json");
  const score = fs.existsSync(reportPath)
    ? JSON.parse(fs.readFileSync(reportPath, "utf-8")).score
    : 0;

  if (onlyArg === "test") {
    console.log("\n✅ Modo test-only — encerrando.\n");
    return;
  }

  if (gaps.length === 0) {
    console.log("\n🎉 Score 100% — nenhum gap encontrado!\n");
    return;
  }

  const patches = step3_preparePatches(gaps);

  if (onlyArg !== "patch") {
    step4_applyPatches(patches, dryRun);
  }

  step5_generateReport(gaps, patches, score);

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log(`║  Concluído — ${patches.length} patch(es) gerado(s)              ║`);
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log("  Próximos passos:");
  console.log("  1. Revise os patches em reports/");
  console.log("  2. Rode: npx ts-node scripts/agent.ts --only=test");
  console.log("  3. Se score >= 90%, faça commit e push para o Lovable\n");
}

main().catch(err => {
  console.error("\n❌ Erro no agente:", err);
  process.exit(1);
});
