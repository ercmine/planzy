# Geospatial platform integration (`geo.perbug.com`)

Perbug geospatial responsibilities are now split across two deployable services:

- **Backend server**: business/product APIs, calls geo service through a typed gateway (`backend/src/geo`).
- **Geo server (`geo.perbug.com`)**: geocode/reverse-geocode API in front of self-hosted Nominatim.

## Backend integration path

Backend routes call `GeoGateway` rather than scattered raw HTTP/Nominatim calls:

- `backend/src/geo/config.ts`: env-driven runtime config
- `backend/src/geo/client.ts`: typed client with timeout/retry/auth header
- `backend/src/geo/gateway.ts`: switches between remote geo host and local fallback
- `backend/src/geo/http.ts`: standardized handlers for geocoding endpoints and health/readiness/version

## API surface

- `POST|GET /v1/geocode`
- `POST|GET /v1/reverse-geocode`
- `GET /v1/geocoding/health`
- `GET /health`
- `GET /ready`
- `GET /version`

## Security model

Service-to-service requests may include `x-perbug-geo-service` set from `GEO_SERVICE_AUTH_SECRET`.

## Deployment assets

See top-level `geo/` for `geo.perbug.com` deployment templates:

- Nginx TLS reverse proxy config
- systemd unit template
- deployment sequence script
- env examples and runbooks
