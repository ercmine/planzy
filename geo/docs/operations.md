# Geo Operations Runbook

## Deploy target
- Host: home server (Dell R910 supported) or equivalent Linux host.
- Public endpoint: `https://geo.dryad.dev` via nginx reverse proxy + TLS.

## Critical checks
1. `curl -f https://geo.dryad.dev/health`
2. `curl -f https://geo.dryad.dev/ready`
3. `curl -f https://geo.dryad.dev/version`
4. `curl -f https://geo.dryad.dev/metrics`

## Security
- Set `GEO_INTERNAL_AUTH_SECRET` on geo service and backend.
- Reject all `/v1/*` requests missing `x-dryad-geo-service`.
- Keep health/readiness public for external uptime checks.

## Home-hosted hardening
- Monitor dynamic DNS updater (Hostinger) at least every 5 minutes.
- Alert if WAN IP changed but DNS record stale >10 minutes.
- Validate router NAT/port forwarding for 80/443.
- Ensure certbot auto-renew timer is active and tested monthly.
- Watch disk pressure for Nominatim DB/flatnode volumes.

## Backup / restore
- Use `ops/scripts/backup_postgres.sh` for backing postgres/Nominatim datastore.
- Validate manifests with `ops/scripts/verify_backup_manifest.sh`.
- Restore drills with `ops/scripts/restore_postgres.sh` on a staging host monthly.

## Failure domains
- backend -> geo auth mismatch (`401 geo_service_unauthorized`)
- geo -> Nominatim timeout (`502 geo_upstream_error`, timeout in metrics)
- DNS drift after home IP change (public checks fail; local health still ok)
- certbot renewal failure (TLS errors while local HTTP remains healthy)
