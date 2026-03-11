# Geo Architecture

- `geo.perbug.com` hosts the geo API and self-hosted Nominatim.
- Main backend calls geo API through `GeoServiceClient` with typed DTOs.
- Frontends continue using the backend and do not call geo host directly.
- Local fallback mode is supported for development when `GEO_SERVICE_ENABLED=false` and `NOMINATIM_BASE_URL` is set.
