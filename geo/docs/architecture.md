# Geo Architecture

## Service boundaries
- `geo.perbug.dev` is a dedicated service consumed by the main backend over internal APIs.
- Frontends should use backend APIs; geo is backend-facing by default.
- Canonical place IDs remain backend-owned; geo provides candidate generation and normalized geographic context.

## API surface
- `GET /health`, `GET /ready`, `GET /version`, `GET /metrics`
- `POST /v1/geocode`
- `POST /v1/reverse-geocode`
- `POST /v1/autocomplete`
- `POST /v1/place-lookup`
- `POST /v1/area-context`

## Internal flow
1. Backend sends signed request with `x-perbug-geo-service`.
2. Geo validates auth middleware.
3. Geo service applies normalization + cache key normalization.
4. Nominatim is called through provider abstraction (timeouts, translated errors, no raw leakage).
5. Geo returns normalized DTOs safe for backend/domain use.

## Caching
- Forward geocode, reverse geocode, autocomplete/place helper requests share normalized keys.
- Cache failure is fail-open (request still executes against provider).
- TTL defaults are controlled in env (`NOMINATIM_*_CACHE_TTL_MS`).

## Observability
- Health/readiness include upstream dependency status.
- Metrics include request counts, cache hits/misses, provider failures/timeouts, and empty-result counters.
- Logs are structured JSON from service and gateway layers.
