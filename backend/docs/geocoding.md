# Geocoding platform service (self-hosted Nominatim)

Perbug now exposes a centralized geocoding service backed by a self-hosted Nominatim instance.

## Internal API

- `GET|POST /v1/geocode`
- `GET|POST /v1/reverse-geocode`
- `GET /v1/geocoding/health`

The handlers call `GeocodingService` (`backend/src/geocoding/service.ts`) rather than invoking Nominatim directly.

## Normalization strategy

Nominatim responses are normalized into typed internal contracts:

- Forward geocode returns display name, coordinates, city/county/state/country hierarchy, postal code, neighborhood, class/type, and optional bounding box.
- Reverse geocode returns display name, coordinates, and area context fields.

Locality fallback order is:

- `city -> town -> village -> municipality -> hamlet`.

Neighborhood fallback order is:

- `neighbourhood -> suburb -> city_district -> quarter`.

## Caching

`GeocodingService` maintains dedicated cache keys and TTLs for:

- Forward geocode text lookups
- Reverse geocode coordinate lookups (rounded to 5 decimals)

Default TTLs:

- Forward: 1 hour
- Reverse: 24 hours

## Fallback policy

Production traffic always targets self-hosted Nominatim. Optional fallback only activates when:

- `NOMINATIM_ENABLE_FALLBACK=true`
- environment is not `prod`
- `NOMINATIM_FALLBACK_BASE_URL` is set

## Observability and health

- Structured logs for geocode and reverse geocode success/fallback paths
- Metrics snapshot for requests, failures, timeouts, no-results, cache hits/misses
- `/v1/geocoding/health` verifies Nominatim reachability via `/status`

## Environment variables

- `NOMINATIM_BASE_URL`
- `NOMINATIM_TIMEOUT_MS`
- `NOMINATIM_GEOCODE_CACHE_TTL_MS`
- `NOMINATIM_REVERSE_CACHE_TTL_MS`
- `NOMINATIM_DEFAULT_LIMIT`
- `NOMINATIM_ENABLE_FALLBACK`
- `NOMINATIM_FALLBACK_BASE_URL`
- `NOMINATIM_USER_AGENT`
