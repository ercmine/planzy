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
function normalizeText(value) {
    return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function nameSimilarity(a, b) {
    const left = new Set(normalizeText(a).split(" ").filter(Boolean));
    const right = new Set(normalizeText(b).split(" ").filter(Boolean));
    if (left.size === 0 || right.size === 0) {
        return 0;
    }
    let overlap = 0;
    for (const token of left) {
        if (right.has(token)) {
            overlap += 1;
        }
    }
    return overlap / Math.max(left.size, right.size);
}
function distanceMeters(aLat, aLng, bLat, bLng) {
    const earth = 6371000;
    const dLat = (bLat - aLat) * (Math.PI / 180);
    const dLng = (bLng - aLng) * (Math.PI / 180);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(aLat * (Math.PI / 180)) * Math.cos(bLat * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    return earth * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function scoreCandidateMatch(place, candidate, opts) {
    const reasons = [];
    const maxDistance = opts?.maxDistanceMeters ?? 500;
    let score = 0;
    const nScore = nameSimilarity(place.primaryName, candidate.name);
    if (nScore >= 0.8) {
        score += 0.55;
        reasons.push("name_exactish");
    }
    else if (nScore >= 0.55) {
        score += 0.3;
        reasons.push("name_partial");
    }
    else {
        reasons.push("name_weak");
    }
    if (typeof candidate.latitude === "number" && typeof candidate.longitude === "number") {
        const dist = distanceMeters(place.latitude, place.longitude, candidate.latitude, candidate.longitude);
        if (dist <= maxDistance) {
            score += 0.35;
            reasons.push("nearby");
        }
        else if (dist <= maxDistance * 2) {
            score += 0.15;
            reasons.push("distance_soft");
        }
        else {
            reasons.push("distance_far");
        }
    }
    if (candidate.countryCode && place.countryCode && candidate.countryCode.toUpperCase() === place.countryCode.toUpperCase()) {
        score += 0.1;
        reasons.push("country_match");
    }
    const canonicalCity = normalizeText(place.city);
    const canonicalRegion = normalizeText(place.region);
    if (candidate.city && canonicalCity && normalizeText(candidate.city) === canonicalCity) {
        score += 0.05;
        reasons.push("city_match");
    }
    if (candidate.region && canonicalRegion && normalizeText(candidate.region) === canonicalRegion) {
        score += 0.05;
        reasons.push("region_match");
    }
    const canonicalTags = typeof place.metadata.tags === "object" && place.metadata.tags
        ? Object.entries(place.metadata.tags).map(([k, v]) => `${normalizeText(k)}:${normalizeText(String(v))}`)
        : [];
    const normalizedHints = (candidate.categoryHints ?? []).map((item) => normalizeText(item)).filter(Boolean);
    if (normalizedHints.length > 0 && canonicalTags.length > 0) {
        const categoryCompatible = normalizedHints.some((hint) => canonicalTags.some((tag) => tag.includes(hint) || hint.includes(tag.split(":")[1] ?? "")));
        if (categoryCompatible) {
            score += 0.08;
            reasons.push("category_compatible");
        }
        else {
            reasons.push("category_mismatch");
            score -= 0.1;
        }
    }
    const confidence = Math.max(0, Math.min(1, Number(score.toFixed(3))));
    const threshold = opts?.minConfidence ?? 0.65;
    return { confidence, matched: confidence >= threshold, reasons };
}
export class InMemoryEnrichmentRepository {
    records = new Map();
    fieldAttrs = new Map();
    jobRuns = new Map();
    recordKey(canonicalPlaceId, sourceName) {
        return `${canonicalPlaceId}:${sourceName}`;
    }
    upsertRecord(record) {
        this.records.set(this.recordKey(record.canonicalPlaceId, record.sourceName), record);
        return record;
    }
    getRecord(canonicalPlaceId, sourceName) {
        return this.records.get(this.recordKey(canonicalPlaceId, sourceName));
    }
    listRecordsByPlace(canonicalPlaceId) {
        return Array.from(this.records.values()).filter((item) => item.canonicalPlaceId === canonicalPlaceId);
    }
    upsertFieldAttribution(canonicalPlaceId, attribution) {
        const existing = this.fieldAttrs.get(canonicalPlaceId) ?? [];
        const without = existing.filter((item) => item.field !== attribution.field || item.sourceName !== attribution.sourceName);
        without.push(attribution);
        this.fieldAttrs.set(canonicalPlaceId, without);
        return attribution;
    }
    listFieldAttributions(canonicalPlaceId) {
        return this.fieldAttrs.get(canonicalPlaceId) ?? [];
    }
    upsertJobRun(run) {
        this.jobRuns.set(run.id, run);
        return run;
    }
    getJobRun(id) {
        return this.jobRuns.get(id);
    }
}
export class EnrichmentLookupCache {
    entries = new Map();
    makeKey(sourceName, scope) {
        return `${sourceName}:${scope}`;
    }
    get(key) {
        const entry = this.entries.get(key);
        if (!entry) {
            return undefined;
        }
        if (entry.expiresAt < Date.now()) {
            this.entries.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlMs) {
        this.entries.set(key, { value, expiresAt: Date.now() + ttlMs });
    }
}
function isSafeImageUrl(value) {
    if (typeof value !== "string" || value.trim().length < 12) {
        return false;
    }
    try {
        const parsed = new URL(value);
        return parsed.protocol === "https:" || parsed.protocol === "http:";
    }
    catch {
        return false;
    }
}
function imageDedupKey(image) {
    return `${image.sourceName}|${image.imageUrl.trim().toLowerCase()}`;
}
export function buildNormalizedPlaceImage(params) {
    if (!isSafeImageUrl(params.imageUrl)) {
        return undefined;
    }
    if (typeof params.width === "number" && typeof params.height === "number") {
        const pixels = params.width * params.height;
        if (pixels > 0 && pixels < 30_000) {
            return undefined;
        }
    }
    const now = nowIso();
    return {
        canonicalPlaceId: params.canonicalPlaceId,
        imageUrl: params.imageUrl,
        sourceName: params.sourceName,
        sourceRecordId: params.sourceRecordId,
        sourceEntityId: params.sourceEntityId,
        attributionLabel: params.attributionLabel,
        attributionUrl: params.attributionUrl,
        license: params.license,
        width: params.width,
        height: params.height,
        isPrimaryCandidate: params.isPrimaryCandidate ?? true,
        confidence: Number(Math.max(0, Math.min(1, params.confidence)).toFixed(3)),
        imageType: params.imageType,
        createdAt: now,
        refreshedAt: now,
        isActive: true,
        rawMetadata: params.rawMetadata
    };
}
export function selectPrioritizedPlaceImages(images) {
    const priority = {
        perbug: 0,
        wikidata: 1,
        opentripmap: 2
    };
    const deduped = new Map();
    for (const image of images) {
        if (!isSafeImageUrl(image.imageUrl)) {
            continue;
        }
        const existing = deduped.get(imageDedupKey(image));
        if (!existing) {
            deduped.set(imageDedupKey(image), image);
            continue;
        }
        const existingPriority = priority[existing.sourceName] ?? 99;
        const candidatePriority = priority[image.sourceName] ?? 99;
        if (candidatePriority < existingPriority) {
            deduped.set(imageDedupKey(image), image);
        }
    }
    const sorted = [...deduped.values()].sort((a, b) => {
        const pDiff = (priority[a.sourceName] ?? 99) - (priority[b.sourceName] ?? 99);
        if (pDiff !== 0)
            return pDiff;
        return a.imageUrl.localeCompare(b.imageUrl);
    });
    return {
        primaryImage: sorted[0],
        imageGallery: sorted.slice(0, 8)
    };
}
export function normalizeWikidataResponse(payload) {
    const aliases = Array.isArray(payload.aliases) ? payload.aliases.filter((item) => typeof item === "string") : [];
    const externalIds = typeof payload.externalIds === "object" && payload.externalIds
        ? Object.entries(payload.externalIds).reduce((acc, [key, value]) => {
            if (typeof value === "string") {
                acc[key] = value;
            }
            return acc;
        }, {})
        : {};
    const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl : undefined;
    const imageLicense = typeof payload.imageLicense === "string" ? payload.imageLicense : undefined;
    const imageAllowed = payload.imageAllowed !== false;
    return {
        sourceId: String(payload.id ?? ""),
        sourceUrl: String(payload.url ?? ""),
        label: typeof payload.label === "string" ? payload.label : undefined,
        description: typeof payload.description === "string" ? payload.description : undefined,
        aliases,
        landmarkType: typeof payload.landmarkType === "string" ? payload.landmarkType : undefined,
        wikipediaUrl: typeof payload.wikipediaUrl === "string" ? payload.wikipediaUrl : undefined,
        imageUrl,
        image: imageUrl && imageAllowed
            ? {
                url: imageUrl,
                sourceUrl: String(payload.imageSourceUrl ?? payload.url ?? ""),
                attributionText: String(payload.imageAttributionText ?? "Image from Wikidata"),
                license: imageLicense
            }
            : undefined,
        externalIds,
        latitude: typeof payload.lat === "number" ? payload.lat : undefined,
        longitude: typeof payload.lng === "number" ? payload.lng : undefined
    };
}
export function normalizeGeoNamesResponse(payload) {
    const alternateNames = Array.isArray(payload.alternateNames)
        ? payload.alternateNames.filter((item) => typeof item === "string")
        : [];
    return {
        sourceId: String(payload.geonameId ?? ""),
        sourceUrl: String(payload.url ?? ""),
        name: typeof payload.name === "string" ? payload.name : undefined,
        city: typeof payload.city === "string" ? payload.city : undefined,
        region: typeof payload.adminName1 === "string" ? payload.adminName1 : undefined,
        county: typeof payload.adminName2 === "string" ? payload.adminName2 : undefined,
        countryCode: typeof payload.countryCode === "string" ? payload.countryCode : undefined,
        alternateNames,
        latitude: typeof payload.lat === "number" ? payload.lat : undefined,
        longitude: typeof payload.lng === "number" ? payload.lng : undefined
    };
}
export function normalizeOpenTripMapResponse(payload) {
    const kinds = typeof payload.kinds === "string"
        ? payload.kinds.split(",").map((item) => item.trim()).filter(Boolean)
        : [];
    const imageUrl = typeof payload.image === "string" ? payload.image : undefined;
    const normalizedImage = imageUrl
        ? buildNormalizedPlaceImage({
            canonicalPlaceId: "",
            sourceName: "opentripmap",
            sourceRecordId: String(payload.xid ?? ""),
            sourceEntityId: String(payload.xid ?? ""),
            imageUrl,
            attributionLabel: String(payload.imageAttributionText ?? "Image from OpenTripMap"),
            attributionUrl: typeof payload.imageSourceUrl === "string" ? payload.imageSourceUrl : String(payload.url ?? ""),
            license: typeof payload.imageLicense === "string" ? payload.imageLicense : undefined,
            width: typeof payload.imageWidth === "number" ? payload.imageWidth : undefined,
            height: typeof payload.imageHeight === "number" ? payload.imageHeight : undefined,
            confidence: 0.58,
            imageType: "attraction",
            rawMetadata: { xid: payload.xid, kinds: payload.kinds }
        })
        : undefined;
    return {
        sourceId: String(payload.xid ?? ""),
        sourceUrl: String(payload.url ?? ""),
        name: typeof payload.name === "string" ? payload.name : undefined,
        description: typeof payload.description === "string" ? payload.description : undefined,
        tourismKinds: kinds,
        wikipedia: typeof payload.wikipedia === "string" ? payload.wikipedia : undefined,
        imageUrl,
        image: normalizedImage,
        latitude: typeof payload.lat === "number" ? payload.lat : undefined,
        longitude: typeof payload.lng === "number" ? payload.lng : undefined
    };
}
function preferCanonical(existing, incoming) {
    if (existing && existing.trim().length >= 20) {
        return existing;
    }
    return incoming ?? existing;
}
export class PlaceEnrichmentService {
    places;
    sourceRecords;
    attributions;
    enrichment;
    providers;
    cache;
    logger;
    constructor(places, sourceRecords, attributions, enrichment, providers, cache = new EnrichmentLookupCache(), logger = { info: () => undefined }) {
        this.places = places;
        this.sourceRecords = sourceRecords;
        this.attributions = attributions;
        this.enrichment = enrichment;
        this.providers = providers;
        this.cache = cache;
        this.logger = logger;
    }
    async enrichPlace(canonicalPlaceId, sourceName, opts) {
        const place = this.places.getById(canonicalPlaceId);
        if (!place) {
            throw new Error(`canonical place not found: ${canonicalPlaceId}`);
        }
        const attemptedAt = nowIso();
        const cachedKey = this.cache.makeKey(sourceName, canonicalPlaceId);
        let payload = !opts?.forceRefresh ? this.cache.get(cachedKey) : undefined;
        try {
            if (payload === undefined) {
                payload = await this.providers[sourceName](place);
                this.cache.set(cachedKey, payload, 10 * 60 * 1000);
            }
        }
        catch (error) {
            const failed = this.enrichment.upsertRecord({
                id: stableId("enr", canonicalPlaceId, sourceName),
                canonicalPlaceId,
                sourceName,
                status: "failed",
                lastAttemptAt: attemptedAt,
                errorCode: "upstream_error",
                errorMessage: error instanceof Error ? error.message : String(error),
                mergeSummary: { updatedFields: [], skippedFields: ["all"] },
                ruleVersion: "v1",
                metadata: {}
            });
            return failed;
        }
        if (!payload) {
            const record = this.enrichment.upsertRecord({
                id: stableId("enr", canonicalPlaceId, sourceName),
                canonicalPlaceId,
                sourceName,
                status: "no_match",
                lastAttemptAt: attemptedAt,
                mergeSummary: { updatedFields: [], skippedFields: ["all"] },
                ruleVersion: "v1",
                metadata: { reason: "no_candidate" }
            });
            return record;
        }
        try {
            const normalized = sourceName === "wikidata"
                ? normalizeWikidataResponse(payload)
                : sourceName === "geonames"
                    ? normalizeGeoNamesResponse(payload)
                    : normalizeOpenTripMapResponse(payload);
            const scored = scoreCandidateMatch(place, {
                sourceId: normalized.sourceId,
                name: "label" in normalized ? normalized.label : ("name" in normalized ? normalized.name : undefined),
                latitude: normalized.latitude,
                longitude: normalized.longitude,
                countryCode: "countryCode" in normalized ? normalized.countryCode : place.countryCode
            }, { minConfidence: sourceName === "wikidata" ? 0.65 : 0.4 });
            if (!scored.matched) {
                return this.enrichment.upsertRecord({
                    id: stableId("enr", canonicalPlaceId, sourceName),
                    canonicalPlaceId,
                    sourceName,
                    sourceRecordId: normalized.sourceId,
                    status: "no_match",
                    confidence: scored.confidence,
                    lastAttemptAt: attemptedAt,
                    mergeSummary: { updatedFields: [], skippedFields: ["all"] },
                    ruleVersion: "v1",
                    rawPayload: payload,
                    normalizedPayload: normalized,
                    metadata: { reasons: scored.reasons }
                });
            }
            const merged = this.mergeEnrichment(place, sourceName, normalized, scored.confidence);
            this.places.upsertPlace(merged.place);
            this.sourceRecords.upsertSourceRecord(merged.sourceRecord);
            this.attributions.upsertAttribution(merged.attribution);
            merged.fieldAttributions.forEach((attr) => this.enrichment.upsertFieldAttribution(canonicalPlaceId, attr));
            const record = this.enrichment.upsertRecord({
                id: stableId("enr", canonicalPlaceId, sourceName),
                canonicalPlaceId,
                sourceName,
                sourceRecordId: merged.sourceRecord.sourceRecordId,
                status: "succeeded",
                confidence: scored.confidence,
                lastAttemptAt: attemptedAt,
                lastSuccessAt: attemptedAt,
                mergeSummary: {
                    updatedFields: merged.updatedFields,
                    skippedFields: merged.skippedFields
                },
                freshnessTtlMs: 1000 * 60 * 60 * 24 * 7,
                ruleVersion: "v1",
                rawPayload: payload,
                normalizedPayload: normalized,
                metadata: { reasons: scored.reasons }
            });
            this.logger.info("place.enrichment.applied", {
                canonicalPlaceId,
                sourceName,
                confidence: scored.confidence,
                updatedFields: merged.updatedFields.length,
                skippedFields: merged.skippedFields.length
            });
            return record;
        }
        catch (error) {
            const failed = this.enrichment.upsertRecord({
                id: stableId("enr", canonicalPlaceId, sourceName),
                canonicalPlaceId,
                sourceName,
                status: "failed",
                lastAttemptAt: attemptedAt,
                errorCode: "normalization_error",
                errorMessage: error instanceof Error ? error.message : String(error),
                mergeSummary: { updatedFields: [], skippedFields: ["all"] },
                ruleVersion: "v1",
                rawPayload: payload,
                metadata: {}
            });
            this.logger.error?.("place.enrichment.failed", { canonicalPlaceId, sourceName, error: failed.errorMessage });
            return failed;
        }
    }
    mergeEnrichment(place, sourceName, normalized, confidence) {
        const timestamp = nowIso();
        const updatedFields = [];
        const skippedFields = [];
        const fieldAttributions = [];
        let next = { ...place, metadata: { ...place.metadata }, updatedAt: timestamp };
        const setField = (field, value, allowReplace = false) => {
            const existing = next[field];
            if (typeof value !== "string" || value.trim() === "") {
                skippedFields.push(String(field));
                return;
            }
            if (typeof existing === "string" && existing.trim() && !allowReplace) {
                skippedFields.push(String(field));
                return;
            }
            next = { ...next, [field]: value };
            updatedFields.push(String(field));
            fieldAttributions.push({
                field: String(field),
                sourceName,
                sourceId: String(normalized.sourceId ?? ""),
                sourceUrl: typeof normalized.sourceUrl === "string" ? normalized.sourceUrl : undefined,
                confidence,
                observedAt: timestamp
            });
        };
        if (sourceName === "wikidata") {
            setField("description", preferCanonical(next.description, normalized.description), true);
            setField("primaryName", normalized.label);
            next = {
                ...next,
                metadata: {
                    ...next.metadata,
                    wikidata: {
                        entityId: normalized.sourceId,
                        entityUrl: normalized.sourceUrl,
                        aliases: normalized.aliases,
                        landmarkType: normalized.landmarkType,
                        wikipediaUrl: normalized.wikipediaUrl,
                        image: normalized.image,
                        externalIds: normalized.externalIds
                    }
                }
            };
            if (normalized.image && typeof normalized.image === "object") {
                fieldAttributions.push({
                    field: "images.wikidata",
                    sourceName,
                    sourceId: String(normalized.sourceId ?? ""),
                    sourceUrl: typeof normalized.sourceUrl === "string" ? normalized.sourceUrl : undefined,
                    confidence,
                    observedAt: timestamp
                });
                updatedFields.push("images.wikidata");
            }
        }
        if (sourceName === "geonames") {
            setField("city", normalized.city);
            setField("region", normalized.region);
            setField("countryCode", normalized.countryCode);
            next = {
                ...next,
                metadata: {
                    ...next.metadata,
                    geonames: {
                        county: normalized.county,
                        alternateNames: normalized.alternateNames
                    }
                }
            };
        }
        if (sourceName === "opentripmap") {
            setField("description", preferCanonical(next.description, normalized.description));
            const existingImages = Array.isArray(next.metadata.placeImages)
                ? next.metadata.placeImages
                : [];
            const opentripImage = normalized.image && typeof normalized.image === "object"
                ? buildNormalizedPlaceImage({
                    canonicalPlaceId: place.id,
                    sourceName,
                    sourceRecordId: String(normalized.sourceId ?? ""),
                    sourceEntityId: String(normalized.sourceId ?? ""),
                    imageUrl: String(normalized.image.imageUrl ?? ""),
                    attributionLabel: String(normalized.image.attributionLabel ?? "Image from OpenTripMap"),
                    attributionUrl: typeof normalized.image.attributionUrl === "string"
                        ? normalized.image.attributionUrl
                        : String(normalized.sourceUrl ?? ""),
                    license: typeof normalized.image.license === "string" ? normalized.image.license : undefined,
                    width: typeof normalized.image.width === "number" ? normalized.image.width : undefined,
                    height: typeof normalized.image.height === "number" ? normalized.image.height : undefined,
                    confidence,
                    imageType: "attraction",
                    rawMetadata: normalized.image
                })
                : undefined;
            const wikidataImage = normalized.sourceId
                ? (next.metadata.wikidata?.image)
                : undefined;
            const wikidataCandidate = wikidataImage?.url
                ? buildNormalizedPlaceImage({
                    canonicalPlaceId: place.id,
                    sourceName: "wikidata",
                    sourceRecordId: String(next.metadata.wikidata?.entityId ?? ""),
                    sourceEntityId: String(next.metadata.wikidata?.entityId ?? ""),
                    imageUrl: wikidataImage.url,
                    attributionLabel: wikidataImage.attributionText ?? "Image from Wikidata",
                    attributionUrl: wikidataImage.sourceUrl,
                    license: wikidataImage.license,
                    confidence: 0.85,
                    imageType: "landmark"
                })
                : undefined;
            const selected = selectPrioritizedPlaceImages([
                ...existingImages.filter((item) => {
                    if (!item || typeof item !== "object")
                        return false;
                    const r = item;
                    return isSafeImageUrl(r.imageUrl) && typeof r.sourceName === "string" && typeof r.attributionLabel === "string";
                }).map((item) => ({
                    imageUrl: item.imageUrl,
                    sourceName: item.sourceName,
                    attributionLabel: item.attributionLabel,
                    attributionUrl: item.attributionUrl,
                    license: item.license,
                    imageType: item.imageType
                })),
                ...(wikidataCandidate ? [{
                        imageUrl: wikidataCandidate.imageUrl,
                        sourceName: wikidataCandidate.sourceName,
                        attributionLabel: wikidataCandidate.attributionLabel,
                        attributionUrl: wikidataCandidate.attributionUrl,
                        license: wikidataCandidate.license,
                        imageType: wikidataCandidate.imageType
                    }] : []),
                ...(opentripImage ? [{
                        imageUrl: opentripImage.imageUrl,
                        sourceName: opentripImage.sourceName,
                        attributionLabel: opentripImage.attributionLabel,
                        attributionUrl: opentripImage.attributionUrl,
                        license: opentripImage.license,
                        imageType: opentripImage.imageType
                    }] : [])
            ]);
            next = {
                ...next,
                metadata: {
                    ...next.metadata,
                    opentripmap: {
                        kinds: normalized.tourismKinds,
                        wikipedia: normalized.wikipedia
                    },
                    placeImages: selected.imageGallery.map((image) => ({ ...image, confidence: image.sourceName === "wikidata" ? 0.85 : confidence })),
                    primaryImage: selected.primaryImage,
                    imageGallery: selected.imageGallery,
                    imageAttributionSummary: selected.imageGallery.map((image) => ({
                        sourceName: image.sourceName,
                        label: image.attributionLabel,
                        url: image.attributionUrl,
                        license: image.license
                    }))
                }
            };
            if (selected.primaryImage) {
                updatedFields.push("images.primary");
                fieldAttributions.push({
                    field: "images.primary",
                    sourceName: selected.primaryImage.sourceName,
                    sourceId: String(normalized.sourceId ?? ""),
                    sourceUrl: selected.primaryImage.attributionUrl,
                    confidence: selected.primaryImage.sourceName === "wikidata" ? 0.85 : confidence,
                    observedAt: timestamp
                });
            }
        }
        next = {
            ...next,
            sourceFreshnessAt: timestamp,
            metadata: {
                ...next.metadata,
                enrichmentState: {
                    ...next.metadata.enrichmentState,
                    [sourceName]: {
                        lastEnrichedAt: timestamp,
                        confidence,
                        sourceRecordId: normalized.sourceId
                    }
                }
            }
        };
        const sourceRecord = {
            id: stableId("src", sourceName, String(normalized.sourceId ?? "")),
            canonicalPlaceId: place.id,
            sourceName,
            sourceRecordId: String(normalized.sourceId ?? ""),
            sourceUrl: typeof normalized.sourceUrl === "string" ? normalized.sourceUrl : undefined,
            rawTags: {},
            rawPayload: normalized,
            sourceCategoryKeys: [],
            lastSeenAt: timestamp,
            lastSyncedAt: timestamp,
            metadata: { enrichment: true },
            createdAt: timestamp,
            updatedAt: timestamp
        };
        const attribution = {
            id: stableId("attr", place.id, sourceName),
            canonicalPlaceId: place.id,
            placeSourceRecordId: sourceRecord.id,
            sourceName,
            sourceLabel: sourceName === "wikidata" ? "Wikidata" : sourceName === "geonames" ? "GeoNames" : "OpenTripMap",
            sourceUrl: sourceRecord.sourceUrl,
            isPrimary: false,
            metadata: { enrichment: true },
            createdAt: timestamp,
            updatedAt: timestamp
        };
        return { place: next, sourceRecord, attribution, fieldAttributions, updatedFields, skippedFields };
    }
}
export class EnrichmentJobRunner {
    enrichment;
    repository;
    constructor(enrichment, repository) {
        this.enrichment = enrichment;
        this.repository = repository;
    }
    async run(input) {
        const startedAt = nowIso();
        const runId = stableId("enrich_run", input.sourceName, startedAt);
        const batchSize = Math.max(1, input.batchSize ?? 20);
        const stats = { attempted: 0, succeeded: 0, failed: 0, noMatch: 0 };
        let cursor = input.resumeCursor ? Number(input.resumeCursor) : 0;
        const run = this.repository.upsertJobRun({ id: runId, sourceName: input.sourceName, startedAt, cursor: String(cursor), stats });
        for (let i = cursor; i < input.canonicalPlaceIds.length; i += batchSize) {
            const ids = input.canonicalPlaceIds.slice(i, i + batchSize);
            for (const canonicalPlaceId of ids) {
                const sources = input.sourceName === "all" ? ["wikidata", "geonames", "opentripmap"] : [input.sourceName];
                for (const source of sources) {
                    stats.attempted += 1;
                    const result = await this.enrichment.enrichPlace(canonicalPlaceId, source);
                    if (result.status === "succeeded") {
                        stats.succeeded += 1;
                    }
                    else if (result.status === "no_match") {
                        stats.noMatch += 1;
                    }
                    else {
                        stats.failed += 1;
                    }
                }
            }
            cursor = i + ids.length;
            this.repository.upsertJobRun({ ...run, cursor: String(cursor), stats });
        }
        return this.repository.upsertJobRun({ ...run, completedAt: nowIso(), cursor: String(cursor), stats });
    }
}
