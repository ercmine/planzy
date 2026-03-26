# Place category normalization + ranking engine

Dryad discovery now uses a dedicated taxonomy + scoring layer for canonical places.

## Taxonomy and normalization

- Canonical categories are defined in `placePlatform/categoryIntelligence.ts` as stable IDs/slugs.
- OSM mapping rules are explicit (`OSM_CATEGORY_RULES`) and include priorities/confidence.
- Cuisine refinements (pizza/sushi/mexican/breakfast) have higher priority than generic `amenity=restaurant` so primary category selection is deterministic.
- Raw tags remain in `PlaceSourceRecord.rawTags`; normalized category assignments are written to `CanonicalPlaceCategory`.
- Ingest stores `normalizationVersion` and completeness metadata on canonical place records.

## Completeness / quality scoring

- `placePlatform/qualityScoring.ts` computes a deterministic score from fields like name, coordinates, address, description, website, phone, source tags, freshness, status/visibility.
- Score is stored in canonical place `qualityScore` and used downstream by ranking.

## Ranking engine

Discovery ranking uses `discovery/rankingEngine.ts` with mode-aware profiles:

- `nearby`: distance-heavy with quality/content guardrails
- `text`: text relevance-heavy with quality/completeness support
- `category`: category match + local relevance + content richness

Component signals:

- distance
- text relevance
- category match strength
- completeness
- quality
- content richness
- engagement
- freshness
- openNow

The engine returns component breakdown for explain/debug surfaces and is shared by nearby/text/category search paths.

## Tuning

- Weights are centralized in `RANKING_PROFILES` and easy to evolve.
- OSM mapping is centralized in `OSM_CATEGORY_RULES` + cuisine refinements.
- Both can be moved to seed/DB config later without schema churn.
