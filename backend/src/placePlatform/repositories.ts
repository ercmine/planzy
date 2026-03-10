import type {
  CanonicalPlace,
  CanonicalPlaceCategory,
  ImportRunStats,
  NearbyPlaceResult,
  NearbyPlacesQuery,
  PlaceCategory,
  PlaceImportRun,
  PlaceSourceAttribution,
  PlaceSourceRecord,
  SourceCategoryMappingRule,
  SourceName
} from "./types.js";

export interface CanonicalPlaceRepository {
  getById(id: string): CanonicalPlace | undefined;
  findBySource(sourceName: string, sourceRecordId: string): CanonicalPlace | undefined;
  upsertPlace(place: CanonicalPlace): CanonicalPlace;
  findNearby(query: NearbyPlacesQuery): NearbyPlaceResult[];
}

export interface SourceRecordRepository {
  getSourceRecordBySourceRef(sourceName: string, sourceRecordId: string): PlaceSourceRecord | undefined;
  upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
  listSourceRecordsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceRecord[];
  listSourceRecordsBySource(sourceName: SourceName): PlaceSourceRecord[];
}

export interface AttributionRepository {
  upsertAttribution(attribution: PlaceSourceAttribution): PlaceSourceAttribution;
  listAttributionsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceAttribution[];
}

export interface CategoryRepository {
  listRules(sourceName: string): SourceCategoryMappingRule[];
  getCategory(id: string): PlaceCategory | undefined;
  upsertCanonicalPlaceCategory(category: CanonicalPlaceCategory): CanonicalPlaceCategory;
  listCanonicalPlaceCategories(canonicalPlaceId: string): CanonicalPlaceCategory[];
}

export interface ImportRunRepository {
  getImportRunById(id: string): PlaceImportRun | undefined;
  upsertImportRun(run: PlaceImportRun): PlaceImportRun;
  listImportRuns(): PlaceImportRun[];
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earth = 6371000;
  const dLat = (bLat - aLat) * (Math.PI / 180);
  const dLng = (bLng - aLng) * (Math.PI / 180);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(aLat * (Math.PI / 180)) * Math.cos(bLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function cloneStats(stats: ImportRunStats): ImportRunStats {
  return { ...stats };
}

export class InMemoryPlacePlatformRepository implements CanonicalPlaceRepository, SourceRecordRepository, AttributionRepository, CategoryRepository, ImportRunRepository {
  private readonly places = new Map<string, CanonicalPlace>();
  private readonly sourceByRef = new Map<string, PlaceSourceRecord>();
  private readonly attributions = new Map<string, PlaceSourceAttribution>();
  private readonly categories = new Map<string, PlaceCategory>();
  private readonly rules: SourceCategoryMappingRule[] = [];
  private readonly placeCategories = new Map<string, CanonicalPlaceCategory[]>();
  private readonly runs = new Map<string, PlaceImportRun>();

  constructor(seed?: { categories?: PlaceCategory[]; rules?: SourceCategoryMappingRule[] }) {
    seed?.categories?.forEach((category) => this.categories.set(category.id, category));
    seed?.rules?.forEach((rule) => this.rules.push(rule));
  }

  private sourceKey(sourceName: string, sourceRecordId: string): string {
    return `${sourceName}:${sourceRecordId}`;
  }

  getById(id: string): CanonicalPlace | undefined {
    return this.places.get(id);
  }

  findBySource(sourceName: string, sourceRecordId: string): CanonicalPlace | undefined {
    const source = this.getSourceRecordBySourceRef(sourceName, sourceRecordId);
    return source ? this.places.get(source.canonicalPlaceId) : undefined;
  }

  upsertPlace(place: CanonicalPlace): CanonicalPlace {
    this.places.set(place.id, place);
    return place;
  }

  findNearby(query: NearbyPlacesQuery): NearbyPlaceResult[] {
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

  getSourceRecordBySourceRef(sourceName: string, sourceRecordId: string): PlaceSourceRecord | undefined {
    return this.sourceByRef.get(this.sourceKey(sourceName, sourceRecordId));
  }

  upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord {
    this.sourceByRef.set(this.sourceKey(record.sourceName, record.sourceRecordId), record);
    return record;
  }

  listSourceRecordsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceRecord[] {
    return Array.from(this.sourceByRef.values()).filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  listSourceRecordsBySource(sourceName: SourceName): PlaceSourceRecord[] {
    return Array.from(this.sourceByRef.values()).filter((item) => item.sourceName === sourceName);
  }

  upsertAttribution(attribution: PlaceSourceAttribution): PlaceSourceAttribution {
    this.attributions.set(attribution.id, attribution);
    return attribution;
  }

  listAttributionsByCanonicalPlaceId(canonicalPlaceId: string): PlaceSourceAttribution[] {
    return Array.from(this.attributions.values()).filter((item) => item.canonicalPlaceId === canonicalPlaceId);
  }

  listRules(sourceName: string): SourceCategoryMappingRule[] {
    return this.rules.filter((rule) => rule.sourceName === sourceName && rule.status === "ACTIVE").sort((a, b) => a.priority - b.priority);
  }

  getCategory(id: string): PlaceCategory | undefined {
    return this.categories.get(id);
  }

  upsertCanonicalPlaceCategory(category: CanonicalPlaceCategory): CanonicalPlaceCategory {
    const existing = this.placeCategories.get(category.canonicalPlaceId) ?? [];
    const without = existing.filter((item) => item.categoryId !== category.categoryId);
    const adjusted = category.isPrimary
      ? without.map((item) => ({ ...item, isPrimary: false }))
      : without;
    adjusted.push(category);
    this.placeCategories.set(category.canonicalPlaceId, adjusted);
    return category;
  }

  listCanonicalPlaceCategories(canonicalPlaceId: string): CanonicalPlaceCategory[] {
    return this.placeCategories.get(canonicalPlaceId) ?? [];
  }

  getImportRunById(id: string): PlaceImportRun | undefined {
    return this.runs.get(id);
  }

  upsertImportRun(run: PlaceImportRun): PlaceImportRun {
    this.runs.set(run.id, { ...run, stats: cloneStats(run.stats) });
    return run;
  }

  listImportRuns(): PlaceImportRun[] {
    return Array.from(this.runs.values());
  }
}

export function buildNearbyPlacesSqlQuery(): string {
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
