# Geo Operations Runbook

## Health model
- `/health`: overall availability + upstream status.
- `/ready`: readiness for traffic, including upstream checks.
- `/version`: service metadata.

## Failure domains
- backend -> geo auth mismatch
- geo -> nominatim timeout/unavailable
- backend feature fail-open behavior when geo host is down (`GEO_SERVICE_FAIL_OPEN`)
