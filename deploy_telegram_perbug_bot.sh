#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_NAME="$(basename "$0")"
DOMAIN="telegram.perbug.com"
BOT_USERNAME="perbugbot"
APP_NAME="perbug-telegram-bot"
APP_USER="perbugbot"
APP_GROUP="perbugbot"
APP_DIR="/opt/${APP_NAME}"
CONFIG_DIR="/etc/${APP_NAME}"
ENV_FILE="${CONFIG_DIR}/${APP_NAME}.env"
SERVICE_FILE="/etc/systemd/system/${APP_NAME}.service"
NGINX_SITE_FILE="/etc/nginx/sites-available/${APP_NAME}"
NGINX_SITE_LINK="/etc/nginx/sites-enabled/${APP_NAME}"
APP_PORT="8088"
PUBLIC_BOT_BASE_URL="https://${DOMAIN}"
MINI_APP_URL="https://app.perbug.com"
CERTBOT_EMAIL=""
NODE_MAJOR="20"
TELEGRAM_WEBHOOK_PATH="/telegram/webhook"

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

log() { printf "%b[%s] %s%b\n" "$COLOR_BLUE" "$SCRIPT_NAME" "$1" "$COLOR_RESET"; }
ok() { printf "%b[%s] %s%b\n" "$COLOR_GREEN" "$SCRIPT_NAME" "$1" "$COLOR_RESET"; }
warn() { printf "%b[%s] WARNING: %s%b\n" "$COLOR_YELLOW" "$SCRIPT_NAME" "$1" "$COLOR_RESET"; }
err() { printf "%b[%s] ERROR: %s%b\n" "$COLOR_RED" "$SCRIPT_NAME" "$1" "$COLOR_RESET" >&2; }

usage() {
  cat <<USAGE
Usage:
  sudo bash ${SCRIPT_NAME} [options]

Options:
  --domain <domain>                 Domain to deploy (default: ${DOMAIN})
  --mini-app-url <url>              Mini App URL (default: ${MINI_APP_URL})
  --bot-username <username>         Bot username without @ (default: ${BOT_USERNAME})
  --certbot-email <email>           Email for certbot registration (required for TLS)
  --app-port <port>                 Local app port (default: ${APP_PORT})
  --help                            Show this help
USAGE
}

require_root() { [[ "${EUID}" -eq 0 ]] || { err "Please run as root (use sudo)."; exit 1; }; }

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --domain) DOMAIN="$2"; PUBLIC_BOT_BASE_URL="https://${DOMAIN}"; shift 2 ;;
      --mini-app-url) MINI_APP_URL="$2"; shift 2 ;;
      --bot-username) BOT_USERNAME="$2"; shift 2 ;;
      --certbot-email) CERTBOT_EMAIL="$2"; shift 2 ;;
      --app-port) APP_PORT="$2"; shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *) err "Unknown argument: $1"; usage; exit 1 ;;
    esac
  done
  [[ -n "${CERTBOT_EMAIL}" ]] || { err "--certbot-email is required."; exit 1; }
}

run_cmd() { log "Running: $*"; "$@"; }

check_os() {
  log "Checking OS compatibility"
  [[ -f /etc/os-release ]] || { err "Cannot detect OS."; exit 1; }
  # shellcheck disable=SC1091
  source /etc/os-release
  [[ "${ID:-}" == "ubuntu" ]] || { err "Ubuntu required. Detected ${ID:-unknown}."; exit 1; }
  [[ "${VERSION_ID:-}" == "24.04" ]] || warn "Expected Ubuntu 24.04, got ${VERSION_ID:-unknown}."
  ok "OS check passed"
}

install_base_packages() {
  run_cmd apt-get update -y
  run_cmd apt-get install -y ca-certificates curl gnupg lsb-release nginx certbot python3-certbot-nginx jq
}

install_nodejs() {
  if command -v node >/dev/null 2>&1; then
    log "Node already installed: $(node -v)"
    return
  fi
  run_cmd mkdir -p /etc/apt/keyrings
  run_cmd bash -c "curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg"
  run_cmd bash -c "echo 'deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main' > /etc/apt/sources.list.d/nodesource.list"
  run_cmd apt-get update -y
  run_cmd apt-get install -y nodejs
  ok "Node installed: $(node -v), npm $(npm -v)"
}

create_app_user() {
  if id -u "${APP_USER}" >/dev/null 2>&1; then
    log "User ${APP_USER} exists"
  else
    run_cmd useradd --system --create-home --home-dir "/home/${APP_USER}" --shell /usr/sbin/nologin "${APP_USER}"
  fi
}

write_app_files() {
  run_cmd mkdir -p "${APP_DIR}"
  cat > "${APP_DIR}/package.json" <<'JSON'
{
  "name": "perbug-telegram-bot",
  "version": "1.0.0",
  "description": "Perbug Telegram Mini App bot service",
  "main": "server.js",
  "private": true,
  "type": "commonjs",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "helmet": "^8.1.0",
    "morgan": "^1.10.0",
    "telegraf": "^4.16.3"
  }
}
JSON

  cat > "${APP_DIR}/server.js" <<'JS'
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { Telegraf, Markup } = require('telegraf');

for (const name of ['TELEGRAM_BOT_TOKEN']) {
  if (!process.env[name]) {
    console.error(`[fatal] Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const config = {
  port: Number(process.env.PORT || '8088'),
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  botUsername: process.env.TELEGRAM_BOT_USERNAME || 'perbugbot',
  miniAppUrl: process.env.MINI_APP_URL || 'https://app.perbug.com',
  publicBaseUrl: process.env.PUBLIC_BOT_BASE_URL || 'https://telegram.perbug.com',
  webhookPath: process.env.TELEGRAM_WEBHOOK_PATH || '/telegram/webhook',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
};

const app = express();
const bot = new Telegraf(config.botToken);

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

bot.start(async (ctx) => {
  await ctx.reply(
    '👋 Welcome to Perbug! Tap below to open the Mini App.',
    Markup.inlineKeyboard([Markup.button.webApp('🚀 Open Perbug Mini App', config.miniAppUrl)])
  );
});

bot.command('app', async (ctx) => {
  await ctx.reply(
    'Open Perbug Mini App:',
    Markup.inlineKeyboard([Markup.button.webApp('Open Mini App', config.miniAppUrl)])
  );
});

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'perbug-telegram-bot', botUsername: config.botUsername, miniAppUrl: config.miniAppUrl, timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => res.status(200).send('perbug-telegram-bot is running'));

app.post(config.webhookPath, (req, res) => {
  const secretHeader = req.get('x-telegram-bot-api-secret-token') || '';
  if (config.webhookSecret && secretHeader !== config.webhookSecret) {
    return res.status(403).json({ ok: false, error: 'Invalid webhook secret header' });
  }
  bot.handleUpdate(req.body)
    .then(() => res.status(200).json({ ok: true }))
    .catch((error) => {
      console.error('[bot] handleUpdate failed', error);
      res.status(500).json({ ok: false, error: 'bot handleUpdate failed' });
    });
});

bot.catch((err, ctx) => {
  console.error('[bot] error', { updateType: ctx?.updateType, message: err?.message });
});

const server = app.listen(config.port, '127.0.0.1', async () => {
  const webhookUrl = `${config.publicBaseUrl}${config.webhookPath}`;
  console.log(`[boot] listening on 127.0.0.1:${config.port}`);
  try {
    await bot.telegram.setWebhook(webhookUrl, config.webhookSecret ? { secret_token: config.webhookSecret, drop_pending_updates: false } : { drop_pending_updates: false });
    console.log(`[boot] webhook set: ${webhookUrl}`);
  } catch (error) {
    console.error('[boot] Failed to set Telegram webhook', error);
  }
});

const shutdown = async (signal) => {
  console.log(`[shutdown] ${signal}`);
  server.close(async () => {
    try {
      await bot.telegram.deleteWebhook({ drop_pending_updates: false });
    } catch (error) {
      console.error('[shutdown] deleteWebhook failed', error);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
JS

  run_cmd chown -R "${APP_USER}:${APP_GROUP}" "${APP_DIR}"
  run_cmd sudo -u "${APP_USER}" bash -lc "cd '${APP_DIR}' && npm install --omit=dev"
}

write_env_file() {
  run_cmd mkdir -p "${CONFIG_DIR}"
  if [[ ! -f "${ENV_FILE}" ]]; then
    cat > "${ENV_FILE}" <<ENV
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=${BOT_USERNAME}
MINI_APP_URL=${MINI_APP_URL}
PUBLIC_BOT_BASE_URL=${PUBLIC_BOT_BASE_URL}
PORT=${APP_PORT}
TELEGRAM_WEBHOOK_PATH=${TELEGRAM_WEBHOOK_PATH}
TELEGRAM_WEBHOOK_SECRET=
ENV
    ok "Created ${ENV_FILE} template"
  else
    warn "Preserving existing ${ENV_FILE}"
  fi
  run_cmd chown -R root:"${APP_GROUP}" "${CONFIG_DIR}"
  run_cmd chmod 0750 "${CONFIG_DIR}"
  run_cmd chmod 0640 "${ENV_FILE}"
}

write_systemd_service() {
  cat > "${SERVICE_FILE}" <<SERVICE
[Unit]
Description=Perbug Telegram Mini App bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_GROUP}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${APP_DIR}/server.js
Restart=always
RestartSec=5
KillSignal=SIGINT
TimeoutStopSec=20
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ReadWritePaths=${APP_DIR}

[Install]
WantedBy=multi-user.target
SERVICE
  run_cmd systemctl daemon-reload
  run_cmd systemctl enable "${APP_NAME}.service"
}

write_nginx_config() {
  cat > "${NGINX_SITE_FILE}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;
    }
}
NGINX

  run_cmd ln -sf "${NGINX_SITE_FILE}" "${NGINX_SITE_LINK}"
  [[ ! -f /etc/nginx/sites-enabled/default ]] || run_cmd rm -f /etc/nginx/sites-enabled/default
  run_cmd nginx -t
  run_cmd systemctl reload nginx
}

provision_tls() {
  run_cmd certbot --nginx --non-interactive --agree-tos --redirect --hsts --staple-ocsp --email "${CERTBOT_EMAIL}" -d "${DOMAIN}"
}

start_service_if_configured() {
  if ! grep -qE '^TELEGRAM_BOT_TOKEN=.+$' "${ENV_FILE}"; then
    warn "TELEGRAM_BOT_TOKEN missing in ${ENV_FILE}. Skipping service start."
    return
  fi
  run_cmd systemctl restart "${APP_NAME}.service"
  run_cmd systemctl status --no-pager "${APP_NAME}.service"
}

verify_deployment() {
  run_cmd nginx -t
  if systemctl is-active --quiet "${APP_NAME}.service"; then ok "Service active"; else warn "Service inactive"; fi
  if ss -lntp | grep -q ":${APP_PORT} "; then ok "Port ${APP_PORT} listening"; else warn "Port ${APP_PORT} not listening"; fi
  if curl -fsS "http://127.0.0.1:${APP_PORT}/health" >/dev/null 2>&1; then ok "Local /health ok"; else warn "Local /health failed"; fi
  if curl -fsS "https://${DOMAIN}/health" >/dev/null 2>&1; then ok "Public /health ok"; else warn "Public /health failed"; fi
}

print_next_steps() {
  cat <<NEXT

Deployment complete.
- App dir: ${APP_DIR}
- Env file: ${ENV_FILE}
- Service: ${SERVICE_FILE}
- Nginx: ${NGINX_SITE_FILE}

If token is still empty:
  sudoedit ${ENV_FILE}
  sudo systemctl restart ${APP_NAME}
  sudo journalctl -u ${APP_NAME} -f

BotFather instructions: docs/telegram_perbug_bot_setup.md
NEXT
}

main() {
  require_root
  parse_args "$@"
  check_os
  install_base_packages
  install_nodejs
  create_app_user
  write_app_files
  write_env_file
  write_systemd_service
  write_nginx_config
  provision_tls
  start_service_if_configured
  verify_deployment
  print_next_steps
}

main "$@"
