#!/bin/bash
# TCM Clinic Assistant — macOS Launcher
# This script is the CFBundleExecutable for the .app bundle.
# It sets up the data directory, initializes the database on first run,
# and starts the Next.js standalone server.

set -e

# ── Resolve paths ──
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../Resources" && pwd)"
DATA_DIR="$HOME/Library/Application Support/TCM-Clinic-Assistant"
SERVER_DIR="$APP_DIR/server"

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "============================================"
echo "  TCM Clinic Assistant — 中医馆辅助诊疗系统"
echo "============================================"
echo ""

# ── Find Node.js ──
if [ -f "$APP_DIR/node/bin/node" ]; then
    NODE="$APP_DIR/node/bin/node"
    echo "[OK] Using bundled Node.js"
elif command -v node &> /dev/null; then
    NODE="node"
    echo "[OK] Using system Node.js: $(node --version)"
else
    osascript -e 'display dialog "需要 Node.js 运行环境，但未找到。\n请安装 Node.js：https://nodejs.org" buttons {"OK"} default button "OK" with icon stop'
    exit 1
fi

# ── First-run initialization ──
if [ ! -d "$DATA_DIR" ]; then
    echo ""
    echo -e "${YELLOW}[INIT] First run — initializing data directory...${NC}"
    mkdir -p "$DATA_DIR/uploads"
    mkdir -p "$DATA_DIR/pdf-outputs"
    mkdir -p "$DATA_DIR/prisma/migrations"
    mkdir -p "$DATA_DIR/prisma/data"

    # Copy migration files
    if [ -d "$APP_DIR/prisma/migrations" ]; then
        cp -R "$APP_DIR/prisma/migrations/"* "$DATA_DIR/prisma/migrations/"
        echo "[OK] Copied database migrations"
    fi

    # Copy herb data
    if [ -f "$APP_DIR/prisma/data/herbs.json" ]; then
        cp "$APP_DIR/prisma/data/herbs.json" "$DATA_DIR/prisma/data/"
        echo "[OK] Copied herb reference data"
    fi

    # Copy default env
    if [ -f "$APP_DIR/.env.defaults" ]; then
        cp "$APP_DIR/.env.defaults" "$DATA_DIR/.env"
        echo "[OK] Created default configuration"
    fi

    # Generate random JWT secret
    if command -v openssl &> /dev/null; then
        JWT_SECRET=$(openssl rand -hex 32)
    else
        JWT_SECRET=$(od -vN 32 -An -tx1 /dev/urandom | tr -d ' \n')
    fi
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|JWT_SECRET=auto-generated-on-first-run|JWT_SECRET=$JWT_SECRET|" "$DATA_DIR/.env"
    else
        sed -i "s|JWT_SECRET=auto-generated-on-first-run|JWT_SECRET=$JWT_SECRET|" "$DATA_DIR/.env"
    fi
    echo "[OK] Generated secure JWT secret"

    echo -e "${GREEN}[DONE] Data directory initialized at: $DATA_DIR${NC}"
    echo ""
    echo -e "${YELLOW}⚠  AI 功能需要配置 DeepSeek API Key${NC}"
    echo "  编辑 $DATA_DIR/.env"
    echo "  将 your_deepseek_api_key_here 替换为真实 Key，然后重启应用"
    echo ""
fi

# ── Always copy fresh prisma files (schema may change) ──
if [ -d "$APP_DIR/prisma/migrations" ]; then
    cp -R "$APP_DIR/prisma/migrations/"* "$DATA_DIR/prisma/migrations/" 2>/dev/null || true
fi
if [ -f "$APP_DIR/prisma/data/herbs.json" ]; then
    cp "$APP_DIR/prisma/data/herbs.json" "$DATA_DIR/prisma/data/" 2>/dev/null || true
fi

# ── Source user config ──
if [ -f "$DATA_DIR/.env" ]; then
    set -a
    source "$DATA_DIR/.env"
    set +a
fi

# Override DATA_DIR and DATABASE_URL to ensure correct paths
export DATA_DIR
export DATABASE_URL="file:$DATA_DIR/dev.db"
export NODE_ENV=production

# Default port
PORT="${PORT:-3456}"

# ── Prisma engine generation (first run or after app update) ──
PRISMA_ENGINE_MARKER="$DATA_DIR/.prisma_engine_generated"
CURRENT_APP_VERSION="$APP_DIR/version.txt"
if [ ! -f "$PRISMA_ENGINE_MARKER" ] || [ "$APP_DIR/version.txt" -nt "$PRISMA_ENGINE_MARKER" ]; then
    echo ""
    echo -e "${YELLOW}[INIT] Generating Prisma engine for macOS...${NC}"
    cd "$SERVER_DIR"
    if [ -f "$SERVER_DIR/node_modules/.bin/prisma" ]; then
        "$SERVER_DIR/node_modules/.bin/prisma" generate --schema="$APP_DIR/prisma/schema.prisma" 2>&1 || true
    elif command -v npx &> /dev/null; then
        npx prisma generate --schema="$APP_DIR/prisma/schema.prisma" 2>&1 || true
    fi
    touch "$PRISMA_ENGINE_MARKER"
    echo "[OK] Prisma engine ready"
    cd "$SCRIPT_DIR/../.."
fi

# ── Start server ──
echo ""
echo -e "${GREEN}[START] Starting server on http://localhost:${PORT}${NC}"
echo "  Data directory: $DATA_DIR"
echo "  Press Ctrl+C to stop"
echo ""

cd "$SERVER_DIR"
"$NODE" server.js &
SERVER_PID=$!

# Wait for server to be ready
sleep 2

# Open browser
if kill -0 $SERVER_PID 2>/dev/null; then
    open "http://localhost:$PORT"
    echo -e "${GREEN}[READY] Browser opened. Switch to your browser to use the app.${NC}"
else
    echo -e "${RED}[ERROR] Server failed to start. Check logs above.${NC}"
    exit 1
fi

# Wait for server process — handle Ctrl+C gracefully
trap "echo ''; echo 'Shutting down...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM
wait $SERVER_PID
