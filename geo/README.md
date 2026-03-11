# Perbug Geo Super-Directory

This directory centralizes everything required to run Perbug geospatial infrastructure independently on `geo.perbug.com`.

## Layout
- `api/`: endpoint definitions and handler notes for `/v1/geocode`, `/v1/reverse-geocode`, `/health`, `/ready`, `/version`.
- `client/`: backend-facing typed client contract and usage notes.
- `contracts/`: canonical request/response DTOs shared between backend and geo service.
- `config/`: geo and backend env variable catalogs.
- `services/`: Nominatim integration responsibilities and response normalization rules.
- `middleware/`: service-to-service auth and rate-limiting behavior.
- `cache/`: cache key, TTL, and stale-data policies.
- `observability/`: logs, metrics, and health/readiness semantics.
- `deploy/`: nginx, systemd, and rollout scripts for `geo.perbug.com`.
- `docs/`: architecture/runbook/deployment docs.
- `tests/`: contract and integration test plans.
