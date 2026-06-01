#!/bin/bash
# TCM Clinic Assistant — macOS 一键启动脚本
# 双击此文件即可启动（会在终端中运行）
# 将此文件与 server/、prisma/、.env.defaults 放在同一目录

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$HOME/Library/Application Support/TCM-Clinic-Assistant"

echo "============================================"
echo "  TCM Clinic Assistant — 中医馆辅助诊疗系统"
echo "============================================"
echo ""

# ── Find Node.js ──
if command -v node &> /dev/null; then
    NODE="node"
    echo "[OK] Node.js $(node --version)"
else
    echo "[ERROR] 需要 Node.js，请先安装：https://nodejs.org"
    echo "安装后重新双击此文件即可"
    read -p "按 Enter 退出..."
    exit 1
fi

# ── First-run: setup data directory ──
INITIALIZED=false
if [ ! -f "$DATA_DIR/.initialized" ]; then
    INITIALIZED=true
    echo ""
    echo "[INIT] 首次运行 — 初始化数据目录..."
    mkdir -p "$DATA_DIR/uploads"
    mkdir -p "$DATA_DIR/pdf-outputs"
    mkdir -p "$DATA_DIR/prisma/migrations"
    mkdir -p "$DATA_DIR/prisma/data"

    # Copy prisma files
    if [ -d "$SCRIPT_DIR/prisma/migrations" ]; then
        cp -R "$SCRIPT_DIR/prisma/migrations/"* "$DATA_DIR/prisma/migrations/" 2>/dev/null || true
    fi
    if [ -f "$SCRIPT_DIR/prisma/data/herbs.json" ]; then
        cp "$SCRIPT_DIR/prisma/data/herbs.json" "$DATA_DIR/prisma/data/"
    fi

    # Copy config
    if [ -f "$SCRIPT_DIR/.env.defaults" ]; then
        cp "$SCRIPT_DIR/.env.defaults" "$DATA_DIR/.env"
    fi

    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || od -vN 32 -An -tx1 /dev/urandom | tr -d ' \n')
    sed -i '' "s|JWT_SECRET=auto-generated-on-first-run|JWT_SECRET=$JWT_SECRET|" "$DATA_DIR/.env"
    echo "[OK] 已生成安全密钥"

    touch "$DATA_DIR/.initialized"
    echo ""
    echo "⚠  AI 功能需要 DeepSeek API Key"
    echo "   编辑 $DATA_DIR/.env"
    echo "   替换 your_deepseek_api_key_here 为真实 Key，然后重启"
    echo ""
fi

# ── Refresh prisma files (in case of app update) ──
if [ "$INITIALIZED" = false ]; then
    if [ -d "$SCRIPT_DIR/prisma/migrations" ]; then
        cp -R "$SCRIPT_DIR/prisma/migrations/"* "$DATA_DIR/prisma/migrations/" 2>/dev/null || true
    fi
    if [ -f "$SCRIPT_DIR/prisma/data/herbs.json" ]; then
        cp "$SCRIPT_DIR/prisma/data/herbs.json" "$DATA_DIR/prisma/data/" 2>/dev/null || true
    fi
fi

# ── Source user config ──
if [ -f "$DATA_DIR/.env" ]; then
    set -a
    source "$DATA_DIR/.env"
    set +a
fi

export DATA_DIR
export DATABASE_URL="file:$DATA_DIR/dev.db"
export NODE_ENV=production

PORT="${PORT:-3456}"

# ── Generate Prisma engine for macOS ──
PRISMA_MARKER="$DATA_DIR/.prisma_engine_v1"
if [ ! -f "$PRISMA_MARKER" ]; then
    echo "[INIT] 生成 Prisma 引擎..."
    cd "$SCRIPT_DIR/server"
    if [ -f "$SCRIPT_DIR/server/node_modules/.bin/prisma" ]; then
        "$SCRIPT_DIR/server/node_modules/.bin/prisma" generate --schema="$SCRIPT_DIR/prisma/schema.prisma" 2>&1 || true
    elif command -v npx &> /dev/null; then
        npx prisma generate --schema="$SCRIPT_DIR/prisma/schema.prisma" 2>&1 || true
    fi
    touch "$PRISMA_MARKER"
    echo "[OK]"
    cd "$SCRIPT_DIR"
fi

# ── Start server ──
echo ""
echo "============================================"
echo "  服务器启动中..."
echo "  地址: http://localhost:$PORT"
echo "  数据目录: $DATA_DIR"
echo "  按 Ctrl+C 停止服务器"
echo "============================================"
echo ""

cd "$SCRIPT_DIR/server"
"$NODE" server.js &
SERVER_PID=$!

sleep 2
if kill -0 $SERVER_PID 2>/dev/null; then
    open "http://localhost:$PORT"
    echo "[READY] 浏览器已打开"
else
    echo "[ERROR] 服务器启动失败"
    exit 1
fi

trap "echo ''; echo '正在关闭...'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM
wait $SERVER_PID
