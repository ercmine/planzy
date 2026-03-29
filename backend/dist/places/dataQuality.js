import { randomUUID } from "node:crypto";
const DEFAULT_CONFIG = {
    staleHoursDefault: 24 * 14,
    staleHoursHighPriority: 24 * 3,
    syncFailureRetryThreshold: 3,
    minPhotosDefault: 1,
    minPhotosByCategory: { restaurant: 3, hotel: 4, attraction: 2 },
    placeholderDescriptions: ["no description available", "description coming soon", "n/a", "tbd"],
    categoryDriftMinConfidence: 0.55,
    duplicateConfidenceThreshold: 0.7,
    duplicateRadiusKm: 0.2
};
function issueKey(issueType, placeId, suffix) {
    return `${issueType}:${placeId}:${suffix ?? "base"}`;
}
function normalizeText(value) {
    return (value ?? "").trim().toLowerCase();
}
function hoursSince(iso, now) {
    if (!iso)
        return Number.POSITIVE_INFINITY;
    return (now - new Date(iso).getTime()) / (1000 * 60 * 60);
}
function distKm(a, b) {
    const toRad = (deg) => deg * Math.PI / 180;
    const r = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
export class PlaceDataQualityService {
    config;
    now;
    issuesByKey = new Map();
    constructor(config = DEFAULT_CONFIG, now = () => Date.now()) {
        this.config = config;
        this.now = now;
    }
    evaluate(places, sourceRecords) {
        const next = new Map();
        const recordsByPlace = new Map();
        for (const record of sourceRecords) {
            if (!record.canonicalPlaceId)
                continue;
            const arr = recordsByPlace.get(record.canonicalPlaceId) ?? [];
            arr.push(record);
            recordsByPlace.set(record.canonicalPlaceId, arr);
        }
        for (const place of places) {
            const records = recordsByPlace.get(place.canonicalPlaceId) ?? [];
            for (const issue of this.detectForPlace(place, records)) {
                next.set(issue.issueKey, this.mergeIssue(issue));
            }
        }
        for (const issue of this.detectDuplicates(places)) {
            next.set(issue.issueKey, this.mergeIssue(issue));
        }
        this.issuesByKey.clear();
        for (const [key, value] of next)
            this.issuesByKey.set(key, value);
        return [...this.issuesByKey.values()];
    }
    listIssues(filters = {}, page = 0, pageSize = 50) {
        const filtered = [...this.issuesByKey.values()].filter((issue) => {
            if (filters.issueType && issue.issueType !== filters.issueType)
                return false;
            if (filters.severity && issue.severity !== filters.severity)
                return false;
            if (filters.status && issue.status !== filters.status)
                return false;
            if (filters.provider && issue.provider !== filters.provider)
                return false;
            if (filters.city && issue.city !== filters.city)
                return false;
            if (filters.category && issue.category !== filters.category)
                return false;
            if (filters.placeId && issue.placeId !== filters.placeId)
                return false;
            return true;
        }).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
        const offset = Math.max(0, page) * Math.max(1, pageSize);
        const limit = Math.max(1, Math.min(200, pageSize));
        return { total: filtered.length, items: filtered.slice(offset, offset + limit) };
    }
    getIssue(issueId) {
        return [...this.issuesByKey.values()].find((issue) => issue.id === issueId);
    }
    summarize() {
        const open = [...this.issuesByKey.values()].filter((issue) => issue.status === "open" || issue.status === "acknowledged");
        const countBy = (selector) => {
            const map = new Map();
            for (const issue of open) {
                const key = selector(issue);
                if (!key)
                    continue;
                map.set(key, (map.get(key) ?? 0) + 1);
            }
            return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
        };
        return {
            totalOpen: open.length,
            byType: countBy((issue) => issue.issueType),
            bySeverity: countBy((issue) => issue.severity),
            byProvider: countBy((issue) => issue.provider),
            byCity: countBy((issue) => issue.city),
            byCategory: countBy((issue) => issue.category),
            hotspots: countBy((issue) => issue.placeId).slice(0, 10)
        };
    }
    getPlaceSummary(placeId) {
        const issues = [...this.issuesByKey.values()].filter((issue) => issue.placeId === placeId);
        return {
            placeId,
            openIssues: issues.filter((row) => row.status !== "resolved" && row.status !== "ignored"),
            allIssues: issues
        };
    }
    getProviderSummary() {
        const grouped = new Map();
        for (const issue of this.issuesByKey.values()) {
            const provider = issue.provider ?? "unknown";
            const row = grouped.get(provider) ?? { provider, total: 0, open: 0, byType: {} };
            row.total += 1;
            if (issue.status === "open" || issue.status === "acknowledged")
                row.open += 1;
            row.byType[issue.issueType] = (row.byType[issue.issueType] ?? 0) + 1;
            grouped.set(provider, row);
        }
        return [...grouped.values()].sort((a, b) => b.open - a.open);
    }
    updateIssueStatus(issueId, status, actorUserId, note) {
        const issue = this.getIssue(issueId);
        if (!issue)
            return undefined;
        const nowIso = new Date(this.now()).toISOString();
        const updated = {
            ...issue,
            status,
            adminNote: note ?? issue.adminNote,
            resolvedAt: status === "resolved" ? nowIso : undefined,
            resolvedBy: status === "resolved" ? actorUserId : undefined
        };
        this.issuesByKey.set(updated.issueKey, updated);
        return { before: issue, after: updated };
    }
    mergeIssue(next) {
        const existing = this.issuesByKey.get(next.issueKey);
        if (!existing)
            return next;
        return {
            ...next,
            id: existing.id,
            detectedAt: existing.detectedAt,
            status: existing.status,
            adminNote: existing.adminNote,
            resolvedAt: existing.resolvedAt,
            resolvedBy: existing.resolvedBy
        };
    }
    detectForPlace(place, records) {
        const out = [];
        const now = this.now();
        const topProvider = place.sourceLinks[0]?.provider ?? records[0]?.provider;
        const latestSync = records.sort((a, b) => b.fetchTimestamp.localeCompare(a.fetchTimestamp))[0];
        const failedSyncs = records.filter((record) => record.sourceConfidence < 0.6).length;
        if (!latestSync || failedSyncs >= this.config.syncFailureRetryThreshold) {
            out.push(this.buildIssue(place, "sync_failure", "high", {
                provider: topProvider,
                evidence: { latestSyncAt: latestSync?.fetchTimestamp, failureCount: failedSyncs, threshold: this.config.syncFailureRetryThreshold }
            }));
        }
        const usablePhotos = place.photoGallery.filter((photo) => photo.status !== "broken" && photo.status !== "placeholder");
        const minPhotos = this.config.minPhotosByCategory[place.canonicalCategory] ?? this.config.minPhotosDefault;
        if (usablePhotos.length < minPhotos || !place.primaryPhoto || place.primaryPhoto.status === "broken") {
            out.push(this.buildIssue(place, "missing_photos", usablePhotos.length === 0 ? "high" : "medium", {
                provider: topProvider,
                evidence: { usablePhotoCount: usablePhotos.length, minPhotos, hasPrimaryPhoto: Boolean(place.primaryPhoto?.url) }
            }));
        }
        const description = normalizeText(place.longDescription ?? place.shortDescription);
        if (!description || this.config.placeholderDescriptions.includes(description)) {
            out.push(this.buildIssue(place, "blank_description", place.dataCompletenessScore < 0.5 ? "high" : "medium", {
                provider: topProvider,
                evidence: { description: place.longDescription ?? place.shortDescription ?? null, descriptionStatus: place.descriptionStatus }
            }));
        }
        const sourceCategories = new Set(place.providerCategories.map((entry) => normalizeText(entry)));
        const canonical = normalizeText(place.canonicalCategory);
        const drift = !sourceCategories.has(canonical) || place.categoryConfidence < this.config.categoryDriftMinConfidence;
        if (drift) {
            out.push(this.buildIssue(place, "category_drift", place.categoryConfidence < 0.4 ? "high" : "medium", {
                provider: topProvider,
                confidence: place.categoryConfidence,
                evidence: { canonicalCategory: place.canonicalCategory, providerCategories: place.providerCategories, categoryConfidence: place.categoryConfidence }
            }));
        }
        const highPriority = place.dataCompletenessScore > 0.8 || place.manualOverrides.primaryDisplayName !== undefined;
        const staleThreshold = highPriority ? this.config.staleHoursHighPriority : this.config.staleHoursDefault;
        const ageHours = hoursSince(place.lastSeenAt, now);
        if (ageHours > staleThreshold) {
            out.push(this.buildIssue(place, "stale_record", highPriority ? "high" : "medium", {
                provider: topProvider,
                evidence: { staleAgeHours: Number(ageHours.toFixed(2)), staleThresholdHours: staleThreshold, lastSeenAt: place.lastSeenAt, lastNormalizedAt: place.lastNormalizedAt }
            }));
        }
        return out;
    }
    detectDuplicates(places) {
        const out = [];
        for (let i = 0; i < places.length; i += 1) {
            for (let j = i + 1; j < places.length; j += 1) {
                const a = places[i];
                const b = places[j];
                if (a.locality && b.locality && a.locality !== b.locality)
                    continue;
                const distance = distKm(a, b);
                if (distance > this.config.duplicateRadiusKm)
                    continue;
                let score = 0;
                const reasons = [];
                if (normalizeText(a.primaryDisplayName) === normalizeText(b.primaryDisplayName)) {
                    score += 0.4;
                    reasons.push("same_name_same_coords");
                }
                if (a.phone && b.phone && a.phone === b.phone) {
                    score += 0.35;
                    reasons.push("same_phone");
                }
                if (a.websiteUrl && b.websiteUrl && a.websiteUrl === b.websiteUrl) {
                    score += 0.35;
                    reasons.push("same_website");
                }
                if (a.formattedAddress && b.formattedAddress && normalizeText(a.formattedAddress) === normalizeText(b.formattedAddress)) {
                    score += 0.25;
                    reasons.push("same_name_similar_address");
                }
                if (score >= this.config.duplicateConfidenceThreshold) {
                    const issue = this.buildIssue(a, "duplicate_place", score > 0.9 ? "critical" : "high", {
                        confidence: Number(Math.min(1, score).toFixed(2)),
                        provider: a.sourceLinks[0]?.provider,
                        evidence: { candidatePlaceId: b.canonicalPlaceId, confidence: Number(Math.min(1, score).toFixed(2)), reasons, distanceKm: Number(distance.toFixed(3)) }
                    }, b.canonicalPlaceId);
                    out.push(issue);
                }
            }
        }
        return out;
    }
    buildIssue(place, issueType, severity, input, suffix) {
        const nowIso = new Date(this.now()).toISOString();
        return {
            id: `dq_${randomUUID()}`,
            issueKey: issueKey(issueType, place.canonicalPlaceId, suffix),
            issueType,
            placeId: place.canonicalPlaceId,
            severity,
            status: "open",
            confidence: input.confidence,
            provider: input.provider,
            city: place.locality,
            category: place.canonicalCategory,
            detectedAt: nowIso,
            lastSeenAt: nowIso,
            evidence: input.evidence
        };
    }
}
export function createPlaceDataQualityConfigFromEnv(env = process.env) {
    return {
        ...DEFAULT_CONFIG,
        staleHoursDefault: Number(env.PLACE_QUALITY_STALE_HOURS_DEFAULT ?? DEFAULT_CONFIG.staleHoursDefault),
        staleHoursHighPriority: Number(env.PLACE_QUALITY_STALE_HOURS_HIGH_PRIORITY ?? DEFAULT_CONFIG.staleHoursHighPriority),
        syncFailureRetryThreshold: Number(env.PLACE_QUALITY_SYNC_RETRY_THRESHOLD ?? DEFAULT_CONFIG.syncFailureRetryThreshold),
        duplicateConfidenceThreshold: Number(env.PLACE_QUALITY_DUPLICATE_CONFIDENCE ?? DEFAULT_CONFIG.duplicateConfidenceThreshold)
    };
}
