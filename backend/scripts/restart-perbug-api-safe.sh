#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE_NAME="${1:-perbug-api}"
API_PORT="${API_PORT:-8080}"

echo "[perbug-api] stopping stray node processes bound to :${API_PORT} (if any)"
pids="$(lsof -tiTCP:${API_PORT} -sTCP:LISTEN || true)"
if [[ -n "${pids}" ]]; then
  while IFS= read -r pid; do
    [[ -z "${pid}" ]] && continue
    unit="$(ps -o unit= -p "${pid}" 2>/dev/null | xargs || true)"
    if [[ "${unit}" == "${SERVICE_NAME}.service" ]]; then
      echo "  - keeping pid=${pid} (owned by ${unit})"
      continue
    fi
    echo "  - terminating stale pid=${pid} unit=${unit:-none}"
    kill -TERM "${pid}" || true
  done <<< "${pids}"
  sleep 1
fi

echo "[perbug-api] restarting systemd service ${SERVICE_NAME}"
systemctl daemon-reload
systemctl restart "${SERVICE_NAME}"
systemctl --no-pager --full status "${SERVICE_NAME}" | sed -n '1,25p'

echo "[perbug-api] listener ownership for :${API_PORT}"
ss -ltnp "( sport = :${API_PORT} )" || true

echo "[perbug-api] local health"
curl -fsS "http://127.0.0.1:${API_PORT}/health" | sed 's/.*/  &/'

