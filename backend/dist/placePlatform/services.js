import { CATEGORY_NORMALIZATION_VERSION, OsmCategoryNormalizationEngine } from "./categoryIntelligence.js";
import { computeCanonicalPlaceCompleteness } from "./qualityScoring.js";
function stableId(prefix, ...parts) {
    const raw = parts.join("|");
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
        hash = (hash * 31 + raw.charCodeAt(i)) | 0;
    }
    return `${prefix}_${Math.abs(hash).toString(36)}`;
}
function nowIso() {
    return new Date().toISOString();
}
function emptyStats() {
    return { processed: 0, created: 0, updated: 0, unchanged: 0, skipped: 0, deduped: 0, failed: 0, staleMarked: 0 };
}
export class CategoryNormalizationService {
    categories;
    constructor(categories) {
        this.categories = categories;
    }
    mapOsmTagsToCategories(tags) {
        const rules = this.categories.listRules("osm");
        const engine = new OsmCategoryNormalizationEngine(rules);
        return engine.normalize(tags).matches.map((match) => {
            const rule = rules.find((item) => item.id === match.ruleId) ?? {
                id: match.ruleId,
                sourceName: "osm",
                sourceKey: "cuisine",
                categoryId: match.categoryId,
                confidence: match.confidence,
                priority: match.priority,
                status: "ACTIVE"
            };
            return { categoryId: match.categoryId, confidence: match.confidence, rule };
        });
    }
}
export class PlaceImportService {
    places;
    sourceRecords;
    attributions;
    categories;
    categoryNormalization;
    logger;
    constructor(places, sourceRecords, attributions, categories, categoryNormalization, logger = { info: () => undefined }) {
        this.places = places;
        this.sourceRecords = sourceRecords;
        this.attributions = attributions;
        this.categories = categories;
        this.categoryNormalization = categoryNormalization;
        this.logger = logger;
    }
    ingestOsmPlace(input, context) {
        const existingSource = this.sourceRecords.getSourceRecordBySourceRef("osm", input.sourceRecordId);
        const timestamp = context?.seenAt ?? nowIso();
        const canonicalPlaceId = existingSource?.canonicalPlaceId ?? stableId("pl", input.sourceRecordId);
        const existingPlace = this.places.getById(canonicalPlaceId);
        const place = {
            id: canonicalPlaceId,
            primaryName: input.name,
            normalizedName: input.name.toLowerCase().trim(),
            slug: existingPlace?.slug,
            latitude: input.lat,
            longitude: input.lng,
            addressLine1: typeof input.payload["address_line_1"] === "string" ? String(input.payload["address_line_1"]) : existingPlace?.addressLine1,
            city: typeof input.payload.city === "string" ? String(input.payload.city) : existingPlace?.city,
            region: typeof input.payload.region === "string" ? String(input.payload.region) : existingPlace?.region,
            postalCode: typeof input.payload.postal_code === "string" ? String(input.payload.postal_code) : existingPlace?.postalCode,
            countryCode: typeof input.payload.country_code === "string" ? String(input.payload.country_code) : existingPlace?.countryCode,
            websiteUrl: input.tags.website ?? existingPlace?.websiteUrl,
            phoneE164: input.tags.phone ?? existingPlace?.phoneE164,
            qualityScore: existingPlace?.qualityScore,
            status: existingPlace?.status ?? "ACTIVE",
            visibilityStatus: existingPlace?.visibilityStatus ?? "PUBLIC",
            sourceFreshnessAt: timestamp,
            metadata: { ...existingPlace?.metadata, source: "osm", tags: input.tags, sourceType: input.sourceType },
            createdAt: existingPlace?.createdAt ?? timestamp,
            updatedAt: timestamp
        };
        this.places.upsertPlace(place);
        const sourceRecord = {
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
            lastSeenAt: timestamp,
            lastSyncedAt: timestamp,
            staleAt: undefined,
            metadata: { ...existingSource?.metadata, ingestionType: "osm_foundation", lastImportRunId: context?.runId },
            createdAt: existingSource?.createdAt ?? timestamp,
            updatedAt: timestamp
        };
        this.sourceRecords.upsertSourceRecord(sourceRecord);
        const completeness = computeCanonicalPlaceCompleteness(place, sourceRecord);
        this.places.upsertPlace({
            ...place,
            qualityScore: completeness.score,
            metadata: {
                ...place.metadata,
                completeness,
                normalizationVersion: CATEGORY_NORMALIZATION_VERSION
            }
        });
        const attribution = {
            id: stableId("attr", canonicalPlaceId, "osm"),
            canonicalPlaceId,
            placeSourceRecordId: sourceRecord.id,
            sourceName: "osm",
            sourceLabel: "OpenStreetMap",
            sourceUrl: input.sourceUrl,
            isPrimary: true,
            metadata: { requiredAttributionText: "Data from OpenStreetMap contributors" },
            createdAt: existingSource?.createdAt ?? timestamp,
            updatedAt: timestamp
        };
        this.attributions.upsertAttribution(attribution);
        const normalizedCategories = this.categoryNormalization.mapOsmTagsToCategories(input.tags);
        normalizedCategories.forEach((normalized, index) => {
            const placeCategory = {
                id: stableId("plcat", canonicalPlaceId, normalized.categoryId),
                canonicalPlaceId,
                categoryId: normalized.categoryId,
                isPrimary: index === 0,
                confidence: normalized.confidence,
                source: "NORMALIZED"
            };
            this.categories.upsertCanonicalPlaceCategory(placeCategory);
        });
        const outcome = existingSource
            ? (JSON.stringify(existingSource.rawPayload) === JSON.stringify(input.payload)
                && JSON.stringify(existingSource.rawTags) === JSON.stringify(input.tags)
                && existingSource.rawName === input.name
                && existingSource.latitude === input.lat
                && existingSource.longitude === input.lng
                ? "unchanged"
                : "updated")
            : "created";
        this.logger.info("place.import.osm", {
            outcome,
            canonicalPlaceId,
            sourceRecordId: input.sourceRecordId,
            categoriesApplied: normalizedCategories.length,
            runId: context?.runId
        });
        return {
            canonicalPlaceId,
            sourceRecordId: input.sourceRecordId,
            outcome,
            categoriesApplied: normalizedCategories.map((item) => item.categoryId)
        };
    }
}
export class OsmImportRunnerService {
    importer;
    sourceRecords;
    runs;
    logger;
    constructor(importer, sourceRecords, runs, logger = { info: () => undefined }) {
        this.importer = importer;
        this.sourceRecords = sourceRecords;
        this.runs = runs;
        this.logger = logger;
    }
    runImport(input) {
        const seenAt = nowIso();
        const batchSize = Math.max(1, input.batchSize ?? 100);
        const run = this.runs.upsertImportRun({
            id: input.runId ?? stableId("run", input.mode, input.regionSlug, input.importVersion ?? seenAt),
            sourceName: "osm",
            mode: input.mode,
            regionSlug: input.regionSlug,
            regionLabel: input.regionLabel,
            importVersion: input.importVersion,
            sourceChecksum: input.sourceChecksum,
            status: "RUNNING",
            startedAt: seenAt,
            stats: emptyStats(),
            metadata: { batchSize }
        });
        const stats = { ...run.stats };
        const seenSourceIds = new Set();
        for (let i = 0; i < input.records.length; i += batchSize) {
            const batch = input.records.slice(i, i + batchSize);
            for (const record of batch) {
                stats.processed += 1;
                if (!record.sourceRecordId || !record.name || !Number.isFinite(record.lat) || !Number.isFinite(record.lng)) {
                    stats.skipped += 1;
                    this.logger.warn?.("place.import.osm.skipped", { runId: run.id, reason: "malformed_record", sourceRecordId: record.sourceRecordId });
                    continue;
                }
                if (seenSourceIds.has(record.sourceRecordId)) {
                    stats.deduped += 1;
                    continue;
                }
                seenSourceIds.add(record.sourceRecordId);
                try {
                    const result = this.importer.ingestOsmPlace(record, { runId: run.id, seenAt });
                    if (result.outcome === "created") {
                        stats.created += 1;
                    }
                    else if (result.outcome === "updated") {
                        stats.updated += 1;
                    }
                    else {
                        stats.unchanged += 1;
                        stats.deduped += 1;
                    }
                }
                catch (error) {
                    stats.failed += 1;
                    this.logger.error?.("place.import.osm.failed_record", {
                        runId: run.id,
                        sourceRecordId: record.sourceRecordId,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
            this.runs.upsertImportRun({ ...run, stats, cursor: `${Math.min(i + batchSize, input.records.length)}` });
            this.logger.info("place.import.osm.batch", { runId: run.id, processed: Math.min(i + batchSize, input.records.length), total: input.records.length });
        }
        if (input.markMissingAsStale) {
            const staleAt = new Date(Date.now() + (input.staleAfterMs ?? 24 * 60 * 60 * 1000)).toISOString();
            for (const source of this.sourceRecords.listSourceRecordsBySource("osm")) {
                if (!seenSourceIds.has(source.sourceRecordId) && source.lastSeenAt && source.lastSeenAt <= seenAt) {
                    this.sourceRecords.upsertSourceRecord({ ...source, staleAt, metadata: { ...source.metadata, staleReason: "not_seen_in_latest_run" } });
                    stats.staleMarked += 1;
                }
            }
        }
        const completed = this.runs.upsertImportRun({ ...run, status: "SUCCEEDED", completedAt: nowIso(), stats });
        this.logger.info("place.import.osm.completed", { runId: run.id, status: completed.status, stats });
        return { run: completed, stats };
    }
}
export class NearbyPlacesService {
    places;
    logger;
    constructor(places, logger = { info: () => undefined }) {
        this.places = places;
        this.logger = logger;
    }
    findNearbyPlaces(query) {
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
