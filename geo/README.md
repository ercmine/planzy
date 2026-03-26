# Dryad Geo Platform (`geo.dryad.dev`)

Production geo subsystem that owns geocoding/reverse-geocoding abstraction, normalized place contracts, canonical-place support helpers, and backend service-to-service integrations.

## Components
- **Geo API** (`/v1/geocode`, `/v1/reverse-geocode`, `/v1/autocomplete`, `/v1/place-lookup`, `/v1/area-context`).
- **Provider abstraction** around self-hosted Nominatim with timeout/error translation and normalized DTOs.
- **Backend typed client** (`backend/src/geo/client.ts`) for all backend-to-geo traffic.
- **Security** with shared secret header `x-dryad-geo-service`.
- **Cache and observability** from geocoding service metrics and health/readiness/metrics endpoints.

## Directory map
- `api/`: API surface notes and endpoint behavior.
- `contracts/`: canonical wire contracts for geo responses.
- `client/`: backend client integration guidance.
- `services/`: provider, normalization, and canonical helper behavior.
- `cache/`: key strategy and TTL guidance.
- `middleware/`: auth enforcement + request controls.
- `observability/`: metrics/logging standards.
- `deploy/`: nginx/systemd/deploy scripts for `geo.dryad.dev`.
- `config/`: required env variables.
- `tests/`: contract and integration test coverage plan.
- `docs/`: architecture and runbooks.
