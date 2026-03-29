function distanceMeters(aLat, aLng, bLat, bLng) {
    const earth = 6371000;
    const dLat = (bLat - aLat) * (Math.PI / 180);
    const dLng = (bLng - aLng) * (Math.PI / 180);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(aLat * (Math.PI / 180)) * Math.cos(bLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function cloneStats(stats) {
    return { ...stats };
}
export class InMemoryPlacePlatformRepository {
    places = new Map();
    sourceByRef = new Map();
    attributions = new Map();
    categories = new Map();
    rules = [];
    placeCategories = new Map();
    runs = new Map();
    constructor(seed) {
        seed?.categories?.forEach((category) => this.categories.set(category.id, category));
        seed?.rules?.forEach((rule) => this.rules.push(rule));
    }
    sourceKey(sourceName, sourceRecordId) {
        return `${sourceName}:${sourceRecordId}`;
    }
    getById(id) {
        return this.places.get(id);
    }
    listPlaces() {
        return Array.from(this.places.values());
    }
    findBySource(sourceName, sourceRecordId) {
        const source = this.getSourceRecordBySourceRef(sourceName, sourceRecordId);
        return source ? this.places.get(source.canonicalPlaceId) : undefined;
    }
    upsertPlace(place) {
        this.places.set(place.id, place);
        return place;
    }
    findNearby(query) {
        const statuses = query.statuses ?? ["ACTIVE"];
        const allowedCategoryIds = new Set(query.categoryIds ?? []);
        const needsCategoryFilter = allowedCategoryIds.size > 0;
        return Array.from(this.places.values())
            .filter((place) => statuses.includes(place.status))
            .map((place) => {
            const distance = distanceMeters(query.lat, query.lng, place.latitude, place.longitude);
            const primaryCategory = this.listCanonicalPlaceCategories(place.id).find((item) => item.isPrimary)?.categoryId;
            return { place, distanceMeters: distance, primaryCategoryId: primaryCategory };
        })
            .filter((result) => result.distanceMeters <= query.radiusMeters)
            .filter((result) => {
            if (!needsCategoryFilter) {
                return true;
            }
            return Boolean(result.primaryCategoryId && allowedCategoryIds.has(result.primaryCategoryId));
        })
            .sort((a, b) => a.distanceMeters - b.distanceMeters)
            .slice(0, query.limit ?? 50);
    }
    getSourceRecordBySourceRef(sourceName, sourceRecordId) {
        return this.sourceByRef.get(this.sourceKey(sourceName, sourceRecordId));
    }
    upsertSourceRecord(record) {
        this.sourceByRef.set(this.sourceKey(record.sourceName, record.sourceRecordId), record);
        return record;
    }
    listSourceRecordsByCanonicalPlaceId(canonicalPlaceId) {
        return Array.from(this.sourceByRef.values()).filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    listSourceRecordsBySource(sourceName) {
        return Array.from(this.sourceByRef.values()).filter((item) => item.sourceName === sourceName);
    }
    upsertAttribution(attribution) {
        this.attributions.set(attribution.id, attribution);
        return attribution;
    }
    listAttributionsByCanonicalPlaceId(canonicalPlaceId) {
        return Array.from(this.attributions.values()).filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    listRules(sourceName) {
        return this.rules.filter((rule) => rule.sourceName === sourceName && rule.status === "ACTIVE").sort((a, b) => a.priority - b.priority);
    }
    getCategory(id) {
        return this.categories.get(id);
    }
    upsertCanonicalPlaceCategory(category) {
        const existing = this.placeCategories.get(category.canonicalPlaceId) ?? [];
        const without = existing.filter((item) => item.categoryId !== category.categoryId);
        const adjusted = category.isPrimary
            ? without.map((item) => ({ ...item, isPrimary: false }))
            : without;
        adjusted.push(category);
        this.placeCategories.set(category.canonicalPlaceId, adjusted);
        return category;
    }
    listCanonicalPlaceCategories(canonicalPlaceId) {
        return this.placeCategories.get(canonicalPlaceId) ?? [];
    }
    getImportRunById(id) {
        return this.runs.get(id);
    }
    upsertImportRun(run) {
        this.runs.set(run.id, { ...run, stats: cloneStats(run.stats) });
        return run;
    }
    listImportRuns() {
        return Array.from(this.runs.values());
    }
}
export function buildNearbyPlacesSqlQuery() {
    return `
SELECT
  cp.id,
  cp.primary_name,
  cp.latitude,
  cp.longitude,
  cpc.category_id AS primary_category_id,
  ST_Distance(cp.geo_point, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography) AS distance_meters
FROM canonical_places cp
LEFT JOIN canonical_place_categories cpc
  ON cpc.canonical_place_id = cp.id AND cpc.is_primary = TRUE
WHERE cp.status = ANY($3::text[])
  AND ST_DWithin(cp.geo_point, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $4)
  AND ($5::boolean = FALSE OR cpc.category_id = ANY($6::text[]))
ORDER BY distance_meters ASC
LIMIT $7;
`.trim();
}
export function buildTextSearchPlacesSqlQuery() {
    return `
SELECT
  cp.id,
  cp.primary_name,
  cp.city,
  cp.region,
  cp.country_code,
  ts_rank_cd(
    setweight(to_tsvector('simple', coalesce(cp.primary_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(cp.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(cp.address_line1, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(cp.city, '') || ' ' || coalesce(cp.region, '')), 'C'),
    plainto_tsquery('simple', $1)
  ) AS text_rank,
  similarity(cp.primary_name, $1) AS name_similarity,
  ST_Distance(cp.geo_point, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography) AS distance_meters
FROM canonical_places cp
LEFT JOIN canonical_place_categories cpc
  ON cpc.canonical_place_id = cp.id
WHERE cp.status = 'ACTIVE'
  AND (
    setweight(to_tsvector('simple', coalesce(cp.primary_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(cp.description, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(cp.address_line1, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(cp.city, '') || ' ' || coalesce(cp.region, '')), 'C')
  ) @@ plainto_tsquery('simple', $1)
  AND ($4::text IS NULL OR cp.city = $4)
  AND ($5::text IS NULL OR cp.region = $5)
  AND ($6::text[] IS NULL OR cpc.category_id = ANY($6::text[]))
ORDER BY (text_rank * 0.75 + name_similarity * 0.25) DESC, distance_meters ASC
LIMIT $7;
`.trim();
}
export function buildCategorySearchPlacesSqlQuery() {
    return `
SELECT
  cp.id,
  cp.primary_name,
  cp.city,
  cp.region,
  cp.country_code,
  cpc.category_id,
  cp.quality_score,
  ST_Distance(cp.geo_point, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography) AS distance_meters
FROM canonical_places cp
INNER JOIN canonical_place_categories cpc
  ON cpc.canonical_place_id = cp.id
WHERE cp.status = 'ACTIVE'
  AND cpc.category_id = ANY($1::text[])
  AND ($4::boolean = FALSE OR ST_DWithin(cp.geo_point, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $5))
  AND ($6::text IS NULL OR cp.city = $6)
  AND ($7::text IS NULL OR cp.region = $7)
ORDER BY cp.quality_score DESC NULLS LAST, distance_meters ASC
LIMIT $8;
`.trim();
}
