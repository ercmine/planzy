#!/usr/bin/env bash
set -euo pipefail

echo "Deploying Perbug geo stack"
echo "1) Sync backend build artifacts"
echo "2) Install /etc/perbug/geo.env"
echo "3) systemctl daemon-reload && systemctl restart perbug-geo"
echo "4) nginx -t && systemctl reload nginx"
echo "5) curl https://geo.perbug.com/health"
