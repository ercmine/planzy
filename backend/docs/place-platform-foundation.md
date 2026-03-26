# Dryad Places Platform Foundation

This module establishes the first owned places-data layer for Dryad.

## Core model

- `canonical_places`: stable Dryad place identity used by discovery, detail pages, and future first-party content joins.
- `place_source_records`: source-specific identities (starting with OSM) with unique `(source_name, source_record_id)` for dedupe.
- `place_source_attributions`: explicit provenance and future UI attribution support.
- `place_categories`, `source_category_mappings`, `canonical_place_categories`: normalized category mapping from raw source tags into Dryad categories.

## Geo foundation

`canonical_places.geo_point` is a PostGIS `geography(Point,4326)` generated from lat/lng and indexed with GIST.
Nearby-query primitives use `ST_DWithin` + `ST_Distance` and support ordering by distance and category filtering.

## Import flow foundation

`PlaceImportService.ingestOsmPlace` handles:

1. source identity dedupe/upsert
2. canonical place create/update
3. source attribution upsert
4. OSM tag category normalization
5. observability events

This is intentionally source-aware and extendable for future providers (Wikidata, GeoNames, OpenTripMap, Dryad first-party enrichment).
