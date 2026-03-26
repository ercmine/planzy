# Owned discovery/search foundations

Dryad discovery now supports first-party search modes backed by canonical place storage and internal ranking:

- `GET /v1/discovery/nearby`: location-first radius discovery with category + filter support.
- `GET /v1/discovery/search`: text-first search over canonical place attributes with optional geo bias.
- `GET /v1/discovery/browse`: normalized-category browse with city/region/radius scoping.


See also `docs/place-category-ranking.md` for taxonomy, OSM normalization precedence, completeness scoring, and mode-specific ranking profiles.

## Ranking strategy

Ranking is mode-aware and test-covered:

- Nearby mode: distance > quality/popularity > category/text.
- Text mode: textual relevance > distance/city bias > quality.
- Category mode: category relevance > local relevance > quality/trending.

The ranking pipeline keeps reasons and debug metadata so later personalization and creator-content boosts can be layered without changing external DTOs.

## Caching and observability

A shared in-process search infra layer provides:

- parameterized cache keys (mode + normalized query/filter payload)
- short TTL response candidate caching
- telemetry counters (query counts by mode, cache hit/miss, zero-results)

Debug responses (`?debug=1`) expose ranking mode + telemetry snapshots for operational validation.

## PostGIS SQL primitives

`placePlatform/repositories.ts` now exposes SQL builders for:

- nearby radius querying (`ST_DWithin`, `ST_Distance`)
- text search (`tsvector/tsquery` + trigram similarity)
- category browse joins over normalized category mapping

These query builders define the production SQL contract for PostgreSQL/PostGIS-backed repositories.
