# Place enrichment pipeline (Wikidata, GeoNames, OpenTripMap)

## Source roles
- **Wikidata**: landmark/notability metadata, canonical descriptions, aliases, external IDs, and open image references when safely available.
- **GeoNames**: administrative geography context (city/region/country + alternates).
- **OpenTripMap**: supplemental attraction/tourism metadata and discovery hints.

## Matching strategy
- Conservative source-aware linking based on:
  - token overlap on canonical vs source names
  - coordinate distance threshold
  - country agreement when available
  - admin geography checks (`city`/`region`) where present
  - category compatibility hints for notable places (e.g., tourism/landmark categories)
- `scoreCandidateMatch` defaults to `minConfidence=0.65` and returns explicit `no_match` when below threshold.
- Canonical place IDs remain the product anchor; Wikidata IDs are linked enrichment only.

## Wikidata fields used
- `sourceId` (`Q...`) + source URL
- label + short description
- aliases
- landmark type and Wikipedia URL (if present)
- external IDs map
- image reference + image attribution metadata only when upstream marks image as allowed

## Merge rules
- Merge behavior is field-level and source-specific:
  - Wikidata can fill/upgrade description and adds alias/external ID metadata.
  - Wikidata image metadata is stored as enrichment media (`metadata.wikidata.image`) and attributed; it does not overwrite first-party uploaded media.
  - GeoNames fills missing city/region/country fields and enriches admin metadata.
  - OpenTripMap is supplemental and writes tourism hints in metadata; it does not clobber rich first-party descriptions.
- Canonical place IDs are never replaced during enrichment.

## Image handling strategy
- Backend normalizes external enrichment images into a clean app-facing image array (`images[]`) with:
  - URL
  - source (`wikidata`)
  - attribution text
  - primary flag
- If image licensing/availability is uncertain, image is omitted (graceful no-image fallback).
- App never receives raw Wikidata response payloads.

## Attribution model
- Store enrichment `PlaceSourceRecord` per source and linked source ID.
- Store source-level `PlaceSourceAttribution` for each source.
- Store field-level attribution entries via `EnrichmentRepository.upsertFieldAttribution` for auditability.
- App-facing surfaces should render attribution labels such as “Description from Wikidata” and photo attribution text when present.

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

## App-facing DTO behavior
- Place detail contracts now include:
  - enriched description + `descriptionSource`
  - `images[]` gallery entries for safe external media
  - `notable` metadata (`landmarkType`, aliases, wikipedia URL)
  - source attribution summary
- Discovery/search cards can consume a preview image/snippet without parsing source-specific payload shapes.

## Extensibility
- Add a new source by:
  1. adding provider function in `EnrichmentProviders`
  2. adding source normalizer
  3. defining source merge rules in `PlaceEnrichmentService.mergeEnrichment`
  4. wiring job execution with source name
