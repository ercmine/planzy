# Geo API

Service-to-service API served from `geo.dryad.dev`.

## Public operational endpoints
- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /metrics`

## Protected backend endpoints (`x-dryad-geo-service` required)
- `POST /v1/geocode`
- `POST /v1/reverse-geocode`
- `POST /v1/autocomplete`
- `POST /v1/place-lookup`
- `POST /v1/area-context`

Responses are normalized Dryad DTOs and never expose raw Nominatim objects.
