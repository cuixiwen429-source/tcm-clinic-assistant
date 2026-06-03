#!/bin/bash
# ============================================================
# 药谷云阁 VPS 一键部署脚本
# 目标: 107.173.35.155:2539 | 域名: yaoguyunge.ailat.cc
# 用法: 将此脚本 scp 到 VPS 后执行, 或直接在 VPS 上逐段粘贴
# ============================================================
set -e

SSH_PORT=2539
VPS_IP=107.173.35.155
DOMAIN=yaoguyunge.ailat.cc
APP_DIR=/opt/tcm-clinic
NODE_VERSION=22

echo "============================================"
echo " 药谷云阁 — VPS 一键部署"
echo " 域名: $DOMAIN"
echo "============================================"

# ---- 1. 系统更新 & 基础工具 ----
echo "[1/7] 安装基础依赖..."
apt-get update -qq
apt-get install -y -qq curl git nginx certbot python3-certbot-nginx ufw

# ---- 2. 安装 Node.js 22 ----
echo "[2/7] 安装 Node.js $NODE_VERSION..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
echo "Node: $(node -v) | npm: $(npm -v)"

# ---- 3. 安装 PM2 ----
echo "[3/7] 安装 PM2..."
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi
echo "PM2: $(pm2 -v)"

# ---- 4. 克隆项目 ----
echo "[4/7] 部署项目代码..."
if [ -d "$APP_DIR" ]; then
  echo "目录已存在，执行 git pull..."
  cd "$APP_DIR"
  git pull origin master
else
  mkdir -p "$APP_DIR"
  git clone https://github.com/cuixiwen429-source/tcm-clinic-assistant.git "$APP_DIR"
  cd "$APP_DIR"
fi

# ---- 5. 创建 .env ----
echo "[5/7] 配置环境变量..."
# 生成随机 JWT_SECRET
JWT_SECRET=$(openssl rand -hex 32)

cat > "$APP_DIR/.env" << ENVEOF
DATABASE_URL=file:./dev.db
JWT_SECRET=$JWT_SECRET
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
NEXT_PUBLIC_APP_NAME=药谷云阁中医大健康平台
PORT=3000
ENVEOF

echo ".env 已创建 (JWT_SECRET 已自动生成)"
echo ">> 请编辑 $APP_DIR/.env 填入真实的 DEEPSEEK_API_KEY <<"

# ---- 6. 安装依赖 & 构建 ----
echo "[6/7] 安装 npm 依赖 & 构建项目..."
cd "$APP_DIR"
npm install
npx prisma generate
npx prisma migrate deploy
echo "运行数据库种子数据导入..."
npx prisma db seed || echo "种子数据导入警告（可能已有数据）"
npm run build

# ---- 7. PM2 启动 ----
echo "[7/7] 启动应用..."
pm2 delete tcm-clinic 2>/dev/null || true
pm2 start npm --name tcm-clinic -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ---- 8. Nginx 配置 ----
echo "配置 Nginx 反向代理..."
cat > /etc/nginx/sites-available/yaoguyunge << 'NGINXEOF'
server {
    listen 80;
    server_name yaoguyunge.ailat.cc;

    # 请求体大小限制（图片上传等）
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

# 启用站点
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/yaoguyunge /etc/nginx/sites-enabled/yaoguyunge
nginx -t && systemctl reload nginx

# ---- 9. 防火墙 ----
echo "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow $SSH_PORT/tcp
ufw --force enable 2>/dev/null || true
ufw status verbose

# ---- 10. SSL (Let's Encrypt) ----
echo "申请 SSL 证书..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@ailat.cc --redirect 2>&1 || echo "SSL 证书申请失败，可稍后手动执行: certbot --nginx -d $DOMAIN"

# ---- 11. 数据库备份 Cron ----
echo "设置每日数据库备份..."
mkdir -p /opt/backups
(crontab -l 2>/dev/null; echo "0 2 * * * cp $APP_DIR/prisma/dev.db /opt/backups/tcm-\$(date +\%Y\%m\%d).db") | crontab -

echo ""
echo "============================================"
echo " 部署完成!"
echo " 访问: https://$DOMAIN"
echo " PM2 日志: pm2 logs tcm-clinic"
echo " PM2 状态: pm2 status"
echo " Nginx 日志: tail -f /var/log/nginx/access.log"
echo ""
echo " 别忘了修改 DEEPSEEK_API_KEY:"
echo "   nano $APP_DIR/.env"
echo "   pm2 restart tcm-clinic"
echo "============================================"
