# OSM ingestion + sync pipeline

## Bootstrap imports
- Use `OsmImportRunnerService.runImport({ mode: "bootstrap", ... })` with regional metadata (`regionSlug`, optional version/checksum).
- Records are processed in chunks (`batchSize`) and upserted via `PlaceImportService`.
- Source dedupe key is `(source_name, source_record_id)`.
- Canonical IDs are deterministic from source identity and therefore stable across reruns.

## Incremental sync
- Use `mode: "incremental"` with changed records.
- Existing source records are updated in place and canonical places are refreshed without ID churn.
- `lastSeenAt`, `lastSyncedAt`, and canonical `sourceFreshnessAt` are updated per ingest.
- Optional `markMissingAsStale` marks previously seen records with `staleAt` when absent in a later run.

## Merge and dedupe rules
- If source identity already exists, keep linked canonical ID and update mutable OSM fields.
- If source identity is new, create canonical place and source attribution.
- Non-empty canonical fields are preserved when incoming payload omits that field.
- Category assignment always flows through `CategoryNormalizationService` and raw tags remain stored.

## Observability and resumability
- Import runs are persisted through `ImportRunRepository` with status, cursor, stats, and region metadata.
- Batch progress and per-record failures are logged (`place.import.osm.batch`, `place.import.osm.failed_record`).
- Runs are retry-safe and idempotent because source upsert and canonical resolution are deterministic.
