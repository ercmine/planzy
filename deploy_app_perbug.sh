#!/usr/bin/env bash
set -Eeuo pipefail

BUILD_DIR="/root/perbug/app/build/web"
LIVE_DIR="/var/www/app.perbug.com"
BACKUP_DIR="/var/www/app.perbug.com.backups"

mkdir -p "$BACKUP_DIR"
ts=$(date +%Y%m%d-%H%M%S)

if [ ! -d "$BUILD_DIR" ]; then
  echo "Build directory not found: $BUILD_DIR"
  exit 1
fi

if [ -d "$LIVE_DIR" ]; then
  cp -a "$LIVE_DIR" "$BACKUP_DIR/app.perbug.com-$ts"
fi

mkdir -p "$LIVE_DIR"
rsync -av --delete "$BUILD_DIR"/ "$LIVE_DIR"/

chown -R www-data:www-data "$LIVE_DIR"
find "$LIVE_DIR" -type d -exec chmod 755 {} \;
find "$LIVE_DIR" -type f -exec chmod 644 {} \;

nginx -t
systemctl reload nginx

echo "Deploy complete."
