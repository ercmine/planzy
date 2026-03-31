# Geo Service Contracts (v1)

## Auth
All `/v1/*` endpoints require:
- Header `x-perbug-geo-service: <GEO_INTERNAL_AUTH_SECRET>`

## POST `/v1/geocode`
Request:
```json
{ "query": "Austin", "language": "en", "countryCodes": ["us"], "limit": 5 }
```
Response:
```json
{ "results": [{ "displayName": "Austin, Texas, United States", "lat": 30.2672, "lng": -97.7431, "city": "Austin", "state": "Texas", "country": "United States", "countryCode": "US", "source": "nominatim" }] }
```

## POST `/v1/reverse-geocode`
Request:
```json
{ "lat": 30.2672, "lng": -97.7431 }
```
Response:
```json
{ "result": { "displayName": "Austin, Texas, United States", "lat": 30.2672, "lng": -97.7431, "city": "Austin", "state": "Texas", "country": "United States", "countryCode": "US", "source": "nominatim" } }
```

## POST `/v1/autocomplete`
Request:
```json
{ "query": "aus", "limit": 8, "countryCode": "US" }
```
Response:
```json
{ "suggestions": [{ "id": "nominatim:30.26720:-97.74310:0", "displayName": "Austin, Texas, United States", "lat": 30.2672, "lng": -97.7431, "relevanceScore": 0.88, "source": "nominatim" }] }
```

## POST `/v1/place-lookup`
Request:
```json
{ "query": "Loro Austin", "limit": 5 }
```
Response:
```json
{ "candidates": [{ "displayName": "Loro, Austin", "lat": 30.24, "lng": -97.77, "canonicalSummary": { "canonicalKey": "loro-austin-30.240--97.770", "normalizedName": "loro, austin" } }] }
```

## POST `/v1/area-context`
Request:
```json
{ "lat": 30.2672, "lng": -97.7431 }
```
Response:
```json
{ "context": { "city": "Austin", "region": "Texas", "country": "United States", "countryCode": "US", "lat": 30.2672, "lng": -97.7431, "source": "nominatim" } }
```

## Health endpoints
- `GET /health` full service + upstream state.
- `GET /ready` readiness bit.
- `GET /version` static service metadata.
- `GET /metrics` request/cache/provider counters.
