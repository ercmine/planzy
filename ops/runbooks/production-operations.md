# Perbug production operations hardening

## Scope and dependencies
This runbook hardens operational safety for:
- Backend API and support services
- Geo/open-data stack (`geo.perbug.dev`, Nominatim/PostGIS)
- Main DB + geo DB + Redis
- Queue workers (media/import/reindex/enrichment/notifications)
- AWS media pipeline metadata and object-key integrity
- Scheduled jobs and backup/restore lifecycle

## Health/readiness/liveness model
All critical services must expose:
1. **`/health/live`** (process alive)
2. **`/health/ready`** (dependency-aware readiness)
3. **`/health/deps`** (dependency detail + degraded/down state)

Backend readiness dependencies:
- primary DB reachable
- Redis reachable (degraded if unavailable only when fallback exists)
- queue broker reachable
- required secrets/config loaded
- geo service reachable (required for geo-dependent routes)

Geo readiness dependencies:
- service process alive
- Nominatim API reachable
- geo Postgres/PostGIS reachable
- local cache healthy
- dynamic DNS updater healthy (if home-hosted)

## Metrics baseline
Export Prometheus-compatible metrics for:
- request totals/latency/error rates
- DB latency and failures
- Redis hit/miss, eviction, memory pressure
- queue depth, stuck oldest age, dead-letter counts
- worker heartbeat lag + retries/failures by job class
- media lifecycle transitions and anomaly counts
- backup success/failure and age by system
- restore validation results
- disk usage for DB, backup targets, geo imports, logs, temp/transcoding

## Alert classes
Minimum alert-ready conditions:
- service unavailable or readiness false
- DB unavailable
- queue depth above SLO
- worker heartbeat stale
- backup failed or too old
- restore validation failed
- disk critically low on DB/geo/backup target
- geo service unreachable
- media processing failure spike

## Backups
Canonical backup systems:
- `main_db`: full nightly + WAL/archive incrementals
- `geo_db`: full nightly + optional incremental depending on topology
- `redis`: RDB/AOF snapshots for queue/broker state where needed
- `media_metadata`: DB metadata export for drafts/video/place-linkage states

Storage rules:
- write backups off-host (S3 compatible target)
- immutable naming convention: `perbug/<system>/YYYY/MM/DD/<timestamp>_<type>.sql.gz`
- retention: daily 35d, weekly 12w, monthly 12m
- checksums and manifest required

## Restore readiness
Required artifacts:
- latest manifest with checksum and object URI
- restore script invocation examples
- post-restore validation checklist

Validation checklist:
1. schema version current
2. row counts within expected bounds for critical tables
3. queue enqueues/dequeues functional
4. media metadata references resolvable
5. geo reverse geocode sanity check

## Queue/cron hardening checklist
- every scheduled job has owner, purpose, expected runtime, timeout, lock policy
- no overlapping critical cron without lock
- failures emit structured logs + failure metric
- stuck job detector runs continuously

## Geo/home-hosting safeguards
- monitor dynamic DNS updater heartbeat
- monitor TLS cert expiry and nginx status
- monitor internet reachability to `geo.perbug.dev`
- monitor storage pressure for imports and flatnode files

## Incident quick actions
- **DB outage**: place API in degraded mode, stop mutating workers, failover/restore DB
- **queue runaway**: pause producers, inspect DLQ and retry causes, scale workers
- **backup failure**: rerun backup, verify credentials/bucket quota, raise critical incident
- **geo unreachable**: switch backend to degraded geocoding mode and fallback provider
- **media backlog spike**: scale processors, quarantine failed assets, run anomaly scanner
