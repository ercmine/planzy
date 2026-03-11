# Geo Service Contracts (v1)

## POST /v1/geocode
Request: `{ query, language?, countryCodes?, limit? }`

Response: `{ results: GeoResult[] }`

## POST /v1/reverse-geocode
Request: `{ lat, lng, language?, zoom? }`

Response: `{ result: GeoReverseResult }`

## Service auth
Backend sends header: `x-perbug-geo-service: <GEO_SERVICE_AUTH_SECRET>`.
