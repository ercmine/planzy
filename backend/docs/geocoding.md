# Geospatial integration (`geo.perbug.com`)

Perbug mobile clients **must only call backend geo endpoints**. The backend is the single integration point for `geo.perbug.com` and shields app clients from raw Nominatim schema.

## Runtime architecture

- **Flutter app** → `api.perbug.com` (`/api/geo/*`)
- **Backend geo layer** (`backend/src/geo`) → `geo.perbug.com` (or local fallback)
- **Geo service** (`geo.perbug.com`) → self-hosted Nominatim

## Backend geo module

- `backend/src/geo/config.ts`: env-driven runtime config.
- `backend/src/geo/client.ts`: typed upstream client with timeout/retry/auth.
- `backend/src/geo/gateway.ts`: local/remote gateway switch.
- `backend/src/geo/http.ts`: public + internal handlers, normalization, and public rate limiting.

## Public app-facing endpoints

- `GET /api/geo/search`
- `GET /api/geo/reverse`
- `GET /api/geo/autocomplete`
- `GET /api/geo/nearby` (discovery-backed)

The payloads are Perbug-friendly DTOs (`PerbugGeoPlace`) and are intentionally stable for mobile clients.

## Internal compatibility endpoints

- `POST|GET /v1/geocode`
- `POST|GET /v1/reverse-geocode`
- `POST /v1/autocomplete`
- `POST /v1/place-lookup`
- `POST /v1/area-context`
- `GET /v1/geocoding/health`

## Environment variables

- `GEO_SERVICE_ENABLED`
- `GEO_SERVICE_BASE_URL` (use `https://geo.perbug.com` in prod)
- `GEO_SERVICE_TIMEOUT_MS`
- `GEO_SERVICE_RETRIES`
- `GEO_SERVICE_AUTH_SECRET`
- `GEO_PUBLIC_RATE_LIMIT_PER_MINUTE`
- `NOMINATIM_*` fallback env values for local mode

## Security model

Internal service-to-service requests may include `x-perbug-geo-service` (`GEO_SERVICE_AUTH_SECRET`). Public `/api/geo/*` endpoints are rate-limited and validated by backend before upstream calls.
