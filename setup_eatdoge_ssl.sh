#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="eatdoge.com"
WWW_DOMAIN="www.eatdoge.com"
APP_PORT="5173"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}.conf"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}.conf"
EMAIL="blocklecrypto@gmail.com"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Run this script as root."
    exit 1
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

write_nginx_http_conf() {
  log "Writing initial nginx HTTP config to ${NGINX_SITE}"
  cat > "${NGINX_SITE}" <<NGINXCONF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} ${WWW_DOMAIN};

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_read_timeout 300;
        proxy_connect_timeout 60;
        proxy_send_timeout 300;
    }
}
NGINXCONF
}

enable_site() {
  if [[ ! -L "${NGINX_ENABLED}" ]]; then
    log "Enabling nginx site"
    ln -s "${NGINX_SITE}" "${NGINX_ENABLED}"
  else
    log "Nginx site already enabled"
  fi

  if [[ -L /etc/nginx/sites-enabled/default ]]; then
    log "Removing default nginx site symlink"
    rm -f /etc/nginx/sites-enabled/default
  fi
}

install_packages() {
  log "Updating apt package index"
  apt-get update

  log "Installing nginx, certbot, and python3-certbot-nginx"
  DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx
}

check_app_port() {
  log "Checking whether something is listening on 127.0.0.1:${APP_PORT}"
  if ss -ltn "( sport = :${APP_PORT} )" | grep -q ":${APP_PORT}"; then
    log "Port ${APP_PORT} is listening"
  else
    log "WARNING: Nothing appears to be listening on port ${APP_PORT}"
    log "Nginx will still be configured, but the site will 502 until your app is running"
  fi
}

test_and_reload_nginx() {
  log "Testing nginx configuration"
  nginx -t

  log "Enabling and reloading nginx"
  systemctl enable nginx
  systemctl restart nginx
}

run_certbot() {
  log "Requesting Let's Encrypt certificate for ${DOMAIN} and ${WWW_DOMAIN}"
  certbot --nginx \
    -d "${DOMAIN}" \
    -d "${WWW_DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${EMAIL}" \
    --redirect
}

main() {
  require_root
  install_packages
  require_cmd nginx
  require_cmd certbot
  require_cmd ss

  write_nginx_http_conf
  enable_site
  check_app_port
  test_and_reload_nginx
  run_certbot

  log "Done."
  log "Your site should now be available at:"
  log "  https://${DOMAIN}"
  log "  https://${WWW_DOMAIN}"
}

main "$@"
