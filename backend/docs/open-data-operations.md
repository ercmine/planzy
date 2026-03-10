# Open-data operational infrastructure

This document defines the production operations foundation for Perbug's open-data stack.

## Job types and queues

`placePlatform/operations.ts` adds durable operational job primitives with typed queue segmentation:

- `imports`: OSM bootstrap/incremental sync
- `enrichment`: Wikidata/GeoNames/OpenTripMap refresh and retry flows
- `reindex`: category/ranking/derived-index recomputes
- `backfills`: schema/rule-version or region/source-scoped backfills
- `cache`: deferred invalidation and warm-up tasks

Each job records:

- status (`queued`, `running`, `succeeded`, `failed`, `cancelled`)
- attempts + retry limits
- batch progress (`processed`, `succeeded`, `failed`, `total`, `cursor`)
- run metadata and operational error capture
- idempotency keys for safe repeat enqueue

## Worker orchestration

`OpenDataWorkerOrchestrator` provides:

- queue-level concurrency controls
- per-job handlers with progress callbacks
- failure isolation and retry scheduling
- structured success/failure logging hooks
- latency + status counters through observability

## Caching strategy

`OpenDataCache` adds normalized cache keys and namespace-specific TTLs for:

- discovery reads
- detail payloads
- geocoding paths

Invalidation is tag-based (for example `place:{id}`) so updates/recomputes can clear only affected entries.

## Observability and diagnostics

`OpenDataObservability` provides:

- counters for success/failure/fallback/cache hit/miss
- timer aggregation for queue/api latency
- queue-health driven readiness/degraded status summary

Recommended metrics dimensions include job type, queue, and source.

## Reindex and backfill workflows

Use job enqueue entry points with scoped payloads:

- all-place reindex (`scope=all`)
- region-scoped backfill (`regionSlug=...`)
- source-scoped enrichment refresh (`source=wikidata`)
- rule-version recompute (`ruleVersion=vX`)

All backfill/reindex jobs should be chunked and update `cursor` + progress so runs are resumable and auditable.

## Attribution compliance model

`AttributionComplianceService` ensures source attribution is retained and summarized:

- primary source label/link
- all contributing sources
- required attribution notice text where policy mandates

`CanonicalDetailBackend` returns attribution in the detail contract so downstream product surfaces can comply with source terms.

## Rollout-safe API behavior

`RolloutSafeDiscoveryApi` and `RolloutSafeDetailApi` support:

- feature-flag controlled routing between owned and fallback backends
- graceful fallback if owned stack is degraded
- cache-aware responses
- operational counters without exposing internal debug data to end users

## Practical operational entry points

Use queue enqueue + status inspection as internal operations interfaces:

- enqueue OSM import/sync
- enqueue enrichment backfill/retry
- enqueue category/ranking recompute
- inspect per-queue metrics and job status by ID
- trigger targeted cache invalidation by place tag
