#!/bin/bash
# setup-cron-mac.sh
# Configura o agente para rodar automaticamente no Mac
# Uso: bash setup-cron-mac.sh /caminho/absoluto/do/projeto

set -e

PROJECT_DIR="${1:-$(pwd)}"
AGENT_SCRIPT="$PROJECT_DIR/scripts/agent.ts"
LOG_DIR="$PROJECT_DIR/reports/logs"
PLIST_NAME="br.com.bomcampo.ai-agronomo-agent"
PLIST_PATH="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

# ── Validações ──────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Setup — Agente Fala AI Agrônomo (Mac)       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if [ ! -f "$AGENT_SCRIPT" ]; then
  echo "❌ Não encontrei $AGENT_SCRIPT"
  echo "   Execute este script a partir da raiz do projeto."
  exit 1
fi

NODE_PATH=$(which node)
TSNODE_PATH=$(which ts-node 2>/dev/null || npx which ts-node 2>/dev/null || echo "")

if [ -z "$NODE_PATH" ]; then
  echo "❌ Node.js não encontrado. Instale via: brew install node"
  exit 1
fi

echo "  ✅ Node: $NODE_PATH"
echo "  ✅ Projeto: $PROJECT_DIR"
echo ""

# ── Criar diretório de logs ──────────────────────────────────
mkdir -p "$LOG_DIR"

# ── Detectar ts-node ────────────────────────────────────────
TSNODE_BIN="$PROJECT_DIR/node_modules/.bin/ts-node"
if [ ! -f "$TSNODE_BIN" ]; then
  echo "  📦 Instalando ts-node..."
  cd "$PROJECT_DIR"
  npm install --save-dev ts-node typescript @types/node
fi

echo "  ✅ ts-node: $TSNODE_BIN"
echo ""

# ── Criar wrapper script ─────────────────────────────────────
WRAPPER_PATH="$PROJECT_DIR/scripts/run-agent.sh"
cat > "$WRAPPER_PATH" << WRAPPER
#!/bin/bash
# Wrapper para o cron — não editar manualmente
cd "$PROJECT_DIR"
TIMESTAMP=\$(date '+%Y-%m-%d %H:%M')
echo "" >> "$LOG_DIR/cron.log"
echo "══════════════════════════════" >> "$LOG_DIR/cron.log"
echo "  Rodando agente: \$TIMESTAMP" >> "$LOG_DIR/cron.log"
echo "══════════════════════════════" >> "$LOG_DIR/cron.log"
"$TSNODE_BIN" scripts/agent.ts >> "$LOG_DIR/cron.log" 2>&1
echo "  Finalizado: \$(date '+%H:%M:%S')" >> "$LOG_DIR/cron.log"
WRAPPER
chmod +x "$WRAPPER_PATH"

# ── Opção 1: LaunchAgent (mais confiável no Mac) ─────────────
cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$PLIST_NAME</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$WRAPPER_PATH</string>
  </array>

  <!-- Roda todo dia às 8h -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>8</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>

  <key>StandardOutPath</key>
  <string>$LOG_DIR/launchd-out.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/launchd-err.log</string>

  <key>RunAtLoad</key>
  <false/>

  <key>WorkingDirectory</key>
  <string>$PROJECT_DIR</string>
</dict>
</plist>
PLIST

# ── Ativar o LaunchAgent ─────────────────────────────────────
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "  ✅ LaunchAgent instalado: roda todo dia às 8h"
echo ""

# ── Testar agora ─────────────────────────────────────────────
echo "  🔍 Rodando teste inicial..."
echo ""
cd "$PROJECT_DIR"
"$TSNODE_BIN" scripts/agent.ts --only=test
echo ""

# ── Resumo ───────────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║  Setup concluído!                            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  📅 Agenda: todo dia às 8h (LaunchAgent)"
echo "  📄 Logs: $LOG_DIR/cron.log"
echo ""
echo "  Comandos úteis:"
echo "  ─────────────────────────────────────────────"
echo "  Rodar agora:"
echo "    bash $WRAPPER_PATH"
echo ""
echo "  Ver logs:"
echo "    tail -f $LOG_DIR/cron.log"
echo ""
echo "  Parar o agente:"
echo "    launchctl unload $PLIST_PATH"
echo ""
echo "  Reativar:"
echo "    launchctl load $PLIST_PATH"
echo ""
echo "  Verificar status:"
echo "    launchctl list | grep bomcampo"
echo ""
