# Perbug API VPS runbook

## Ownership model (important)

- `perbug-api.service` is the **only** long-lived backend process.
- Do not run `node dist/server/index.js` manually in background (`&`, screen, tmux, nohup) while systemd is active.
- Port `8080` must be owned by one process only.

## Safe restart

```bash
cd /root/perbug/backend
./scripts/restart-perbug-api-safe.sh perbug-api
```

What this does:

1. Finds listeners on `:8080`.
2. Terminates stale non-systemd listeners.
3. Restarts `perbug-api`.
4. Shows service status, port ownership, and local health.

## Manual verification checklist

```bash
# service status + recent logs
systemctl --no-pager --full status perbug-api
journalctl -u perbug-api -n 120 --no-pager

# only one listener on backend port
ss -ltnp '( sport = :8080 )'

# local health direct to upstream
curl -i http://127.0.0.1:8080/health
curl -i http://127.0.0.1:8080/api/geo/health

# nginx upstream and public probe
nginx -t
curl -i https://api.perbug.com/health
curl -i https://api.perbug.com/api/health
```

Expected:

- `/health` and `/api/health`: `200` with `dependencies.geo` payload.
- `/api/geo/health`: `200` in working custom/nominatim mode, or `503` only for the geo integration itself.
- No repeated `EADDRINUSE` in journal.

## Required service unit shape

`/etc/systemd/system/perbug-api.service` should include:

- `EnvironmentFile=/root/perbug/.env`
- `WorkingDirectory=/root/perbug/backend`
- `ExecStart=/usr/bin/node dist/server/index.js`
- `Restart=always`
- `RestartSec=2`

After edits:

```bash
systemctl daemon-reload
systemctl restart perbug-api
```

## Nginx upstream shape

`api.perbug.com` should proxy to:

```nginx
proxy_pass http://127.0.0.1:8080;
```

Avoid stale upstream targets like `:3001`.

## Perbug node RPC (local only)

Set backend env to the canonical local RPC values:

- `PERBUG_RPC_HOST=127.0.0.1`
- `PERBUG_RPC_PORT=9332`
- `PERBUG_NODE_PORT=9333`
- `PERBUG_RPC_USER=perbugrpc`
- `PERBUG_RPC_PASSWORD=change_this_to_a_long_random_password`

Do not expose RPC publicly. Keep node RPC bound to localhost (`rpcbind=127.0.0.1`, `rpcallowip=127.0.0.1`).
