import {
  type AttributionRepository,
  type CanonicalPlaceRepository,
  type CategoryRepository,
  type SourceRecordRepository
} from "./repositories.js";
import type {
  CanonicalPlace,
  CanonicalPlaceCategory,
  ImportResult,
  NearbyPlaceResult,
  NearbyPlacesQuery,
  OsmPlaceInput,
  PlacePlatformLogger,
  PlaceSourceAttribution,
  PlaceSourceRecord,
  SourceCategoryMappingRule
} from "./types.js";

function stableId(prefix: string, ...parts: string[]): string {
  const raw = parts.join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class CategoryNormalizationService {
  constructor(private readonly categories: CategoryRepository) {}

  mapOsmTagsToCategories(tags: Record<string, string>): Array<{ categoryId: string; confidence: number; rule: SourceCategoryMappingRule }> {
    const rules = this.categories.listRules("osm");
    const matches = rules.filter((rule) => {
      const value = tags[rule.sourceKey];
      if (!value) {
        return false;
      }
      return rule.sourceValue ? value === rule.sourceValue : true;
    });

    return matches.map((rule) => ({ categoryId: rule.categoryId, confidence: rule.confidence, rule }));
  }
}

export class PlaceImportService {
  constructor(
    private readonly places: CanonicalPlaceRepository,
    private readonly sourceRecords: SourceRecordRepository,
    private readonly attributions: AttributionRepository,
    private readonly categories: CategoryRepository,
    private readonly categoryNormalization: CategoryNormalizationService,
    private readonly logger: PlacePlatformLogger = { info: () => undefined }
  ) {}

  ingestOsmPlace(input: OsmPlaceInput): ImportResult {
    const existingSource = this.sourceRecords.getSourceRecordBySourceRef("osm", input.sourceRecordId);
    const timestamp = nowIso();
    const canonicalPlaceId = existingSource?.canonicalPlaceId ?? stableId("pl", input.sourceRecordId);

    const existingPlace = this.places.getById(canonicalPlaceId);
    const place: CanonicalPlace = {
      id: canonicalPlaceId,
      primaryName: input.name,
      normalizedName: input.name.toLowerCase().trim(),
      slug: existingPlace?.slug,
      latitude: input.lat,
      longitude: input.lng,
      addressLine1: typeof input.payload["address_line_1"] === "string" ? String(input.payload["address_line_1"]) : undefined,
      city: typeof input.payload["city"] === "string" ? String(input.payload["city"]) : undefined,
      region: typeof input.payload["region"] === "string" ? String(input.payload["region"]) : undefined,
      postalCode: typeof input.payload["postal_code"] === "string" ? String(input.payload["postal_code"]) : undefined,
      countryCode: typeof input.payload["country_code"] === "string" ? String(input.payload["country_code"]) : undefined,
      websiteUrl: input.tags.website,
      phoneE164: input.tags.phone,
      status: existingPlace?.status ?? "ACTIVE",
      visibilityStatus: existingPlace?.visibilityStatus ?? "PUBLIC",
      metadata: { source: "osm", tags: input.tags },
      createdAt: existingPlace?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    this.places.upsertPlace(place);

    const sourceRecord: PlaceSourceRecord = {
      id: existingSource?.id ?? stableId("src", "osm", input.sourceRecordId),
      canonicalPlaceId,
      sourceName: "osm",
      sourceRecordId: input.sourceRecordId,
      sourceVersion: input.sourceVersion,
      sourceUrl: input.sourceUrl,
      rawName: input.name,
      rawTags: input.tags,
      rawPayload: input.payload,
      latitude: input.lat,
      longitude: input.lng,
      sourceCategoryKeys: Object.keys(input.tags),
      sourceRecordUpdatedAt: input.sourceUpdatedAt,
      importBatchId: input.importBatchId,
      metadata: { ingestionType: "osm_foundation" },
      createdAt: existingSource?.createdAt ?? timestamp,
      updatedAt: timestamp
    };
    this.sourceRecords.upsertSourceRecord(sourceRecord);

    const attribution: PlaceSourceAttribution = {
      id: stableId("attr", canonicalPlaceId, "osm"),
      canonicalPlaceId,
      placeSourceRecordId: sourceRecord.id,
      sourceName: "osm",
      sourceLabel: "OpenStreetMap",
      sourceUrl: input.sourceUrl,
      isPrimary: true,
      metadata: { requiredAttributionText: "Data from OpenStreetMap contributors" },
      createdAt: timestamp,
      updatedAt: timestamp
    };
    this.attributions.upsertAttribution(attribution);

    const normalizedCategories = this.categoryNormalization.mapOsmTagsToCategories(input.tags);
    normalizedCategories.forEach((normalized, index) => {
      const placeCategory: CanonicalPlaceCategory = {
        id: stableId("plcat", canonicalPlaceId, normalized.categoryId),
        canonicalPlaceId,
        categoryId: normalized.categoryId,
        isPrimary: index === 0,
        confidence: normalized.confidence,
        source: "NORMALIZED"
      };
      this.categories.upsertCanonicalPlaceCategory(placeCategory);
    });

    const outcome: ImportResult["outcome"] = existingSource
      ? (JSON.stringify(existingSource.rawPayload) === JSON.stringify(input.payload) ? "unchanged" : "updated")
      : "created";

    this.logger.info("place.import.osm", {
      outcome,
      canonicalPlaceId,
      sourceRecordId: input.sourceRecordId,
      categoriesApplied: normalizedCategories.length
    });

    return {
      canonicalPlaceId,
      sourceRecordId: input.sourceRecordId,
      outcome,
      categoriesApplied: normalizedCategories.map((item) => item.categoryId)
    };
  }
}

export class NearbyPlacesService {
  constructor(private readonly places: CanonicalPlaceRepository, private readonly logger: PlacePlatformLogger = { info: () => undefined }) {}

  findNearbyPlaces(query: NearbyPlacesQuery): NearbyPlaceResult[] {
    const start = Date.now();
    const results = this.places.findNearby(query);
    this.logger.info("place.nearby.query", {
      radiusMeters: query.radiusMeters,
      results: results.length,
      elapsedMs: Date.now() - start,
      categoryFilterCount: query.categoryIds?.length ?? 0
    });
    return results;
  }
}
