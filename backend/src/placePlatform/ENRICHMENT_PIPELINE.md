# Place enrichment pipeline (Wikidata, GeoNames, OpenTripMap)

## Source roles
- **Wikidata**: landmark/notability metadata, canonical descriptions, aliases, external IDs.
- **GeoNames**: administrative geography context (city/region/country + alternates).
- **OpenTripMap**: supplemental attraction/tourism metadata and discovery hints.

## Matching strategy
- Conservative source-aware linking based on:
  - token overlap on canonical vs source names
  - coordinate distance threshold
  - country agreement when available
- `scoreCandidateMatch` defaults to `minConfidence=0.65` and returns explicit `no_match` when below threshold.

## Merge rules
- Merge behavior is field-level and source-specific:
  - Wikidata can fill/upgrade description and adds alias/external ID metadata.
  - GeoNames fills missing city/region/country fields and enriches admin metadata.
  - OpenTripMap is supplemental and writes tourism hints in metadata; it does not clobber rich first-party descriptions.
- Canonical place IDs are never replaced during enrichment.

## Attribution model
- Store enrichment `PlaceSourceRecord` per source and linked source ID.
- Store source-level `PlaceSourceAttribution` for each source.
- Store field-level attribution entries via `EnrichmentRepository.upsertFieldAttribution` for auditability.

## Freshness and lifecycle
- `PlaceEnrichmentRecord` tracks:
  - `lastAttemptAt`, `lastSuccessAt`
  - status (`succeeded`, `failed`, `no_match`)
  - confidence + merge summary
  - source record ID + raw/normalized payload snapshots
- Canonical place metadata tracks per-source enrichment state (`lastEnrichedAt`, confidence, source record ID).

## Jobs/workers and resumability
- `EnrichmentJobRunner` executes source-specific or all-source backfills in batches.
- Job run state stores cursor + aggregated stats (`attempted`, `succeeded`, `failed`, `noMatch`).
- Runner supports resume cursor input and safe retries.

## Extensibility
- Add a new source by:
  1. adding provider function in `EnrichmentProviders`
  2. adding source normalizer
  3. defining source merge rules in `PlaceEnrichmentService.mergeEnrichment`
  4. wiring job execution with source name
