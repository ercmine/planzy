# Geo Test Plan

## Automated coverage
- Config parsing (`backend/src/geo/__tests__/config.test.ts`).
- Auth middleware secret validation (`backend/src/geo/__tests__/middleware.test.ts`).
- Geo client retries/header handling + autocomplete parsing (`backend/src/geo/__tests__/client.test.ts`).
- Geo HTTP handlers auth + autocomplete shape (`backend/src/geo/__tests__/http.test.ts`).
- Nominatim normalization and service behavior (`backend/src/geocoding/__tests__/normalization.test.ts`, `backend/src/geocoding/__tests__/service.test.ts`).
- Geo route-level integration (`backend/src/geocoding/__tests__/http.test.ts`).

## Manual pre-prod checks
1. `/health` and `/ready` with healthy/unhealthy upstream.
2. Unauthorized `/v1/geocode` rejected with `401`.
3. Autocomplete latency and result relevance under typical load.
4. Cache hit/miss movement via `/metrics`.
5. Backup/restore smoke test against latest backup artifact.
