import { normalizeUrl, stableHash } from "./normalization.js";
const providerPriority = {
    google_places: 1,
    foursquare: 2
};
function providerScore(provider) {
    return providerPriority[provider] ?? 4;
}
function normalizePhotoUrl(url) {
    const normalized = normalizeUrl(url);
    if (!normalized) {
        return undefined;
    }
    try {
        const parsed = new URL(normalized);
        for (const key of ["w", "h", "width", "height", "maxWidthPx", "maxHeightPx", "size"]) {
            parsed.searchParams.delete(key);
        }
        return parsed.toString();
    }
    catch {
        return normalized;
    }
}
function buildPhotoFingerprint(provider, photo) {
    const normalizedUrl = normalizePhotoUrl(photo.url ?? photo.fullUrl ?? photo.largeUrl ?? photo.mediumUrl ?? photo.thumbnailUrl);
    return stableHash([
        provider,
        photo.providerPhotoRef,
        photo.sourcePhotoId,
        normalizedUrl,
        photo.width,
        photo.height
    ]);
}
function isWeakAsset(photo) {
    const type = (photo.photoType ?? "other").toLowerCase();
    return type === "logo" || type === "map";
}
function pixelScore(photo) {
    return (photo.width ?? 0) * (photo.height ?? 0);
}
function rankPhoto(photo) {
    const pixels = pixelScore(photo);
    const aspectRatio = photo.aspectRatio ?? (photo.width && photo.height ? photo.width / photo.height : undefined);
    const ratioPenalty = aspectRatio && aspectRatio < 0.6 ? -120 : 0;
    const weakPenalty = isWeakAsset(photo) ? -700 : 0;
    const providerBoost = (6 - providerScore(photo.provider)) * 120;
    const primaryBoost = photo.isPrimary ? 900 : 0;
    return providerBoost + primaryBoost + Math.min(1200, Math.round(pixels / 1200)) + ratioPenalty + weakPenalty;
}
export function normalizeProviderPhoto(params) {
    const { placeId, sourceRecordId, provider, photo, index, fetchedAt } = params;
    const fullUrl = photo.fullUrl ?? photo.largeUrl ?? photo.mediumUrl ?? photo.thumbnailUrl ?? photo.url;
    const mediumUrl = photo.mediumUrl ?? photo.largeUrl ?? photo.thumbnailUrl ?? fullUrl;
    const thumbnailUrl = photo.thumbnailUrl ?? photo.mediumUrl ?? photo.url ?? fullUrl;
    const canonicalUrl = photo.url ?? mediumUrl ?? fullUrl ?? (photo.providerPhotoRef ? `provider://${provider}/${photo.providerPhotoRef}` : undefined);
    const aspectRatio = photo.width && photo.height ? photo.width / photo.height : undefined;
    const fingerprint = buildPhotoFingerprint(provider, photo);
    const canonical = {
        canonicalPhotoId: stableHash([provider, photo.providerPhotoRef, photo.sourcePhotoId, canonicalUrl, index]).slice(0, 16),
        placeId,
        provider,
        sourceProvider: provider,
        sourceType: "provider",
        providerPhotoRef: photo.providerPhotoRef,
        sourcePhotoId: photo.sourcePhotoId ?? photo.providerPhotoRef,
        url: canonicalUrl,
        thumbnailUrl,
        mediumUrl,
        largeUrl: photo.largeUrl ?? fullUrl,
        fullUrl,
        width: photo.width,
        height: photo.height,
        aspectRatio,
        attributionText: photo.attributionText,
        attributionRequired: Boolean(photo.attributionText),
        sourceRecordId,
        isPrimary: photo.isPrimary,
        photoType: photo.photoType ?? "venue",
        status: canonicalUrl ? "active" : "filtered",
        fetchedAt,
        updatedAt: fetchedAt,
        fingerprint,
        qualityScore: (photo.width ?? 0) * (photo.height ?? 0)
    };
    canonical.rankScore = rankPhoto(canonical);
    return canonical;
}
export function dedupeAndRankPhotos(photos) {
    const deduped = new Map();
    for (const photo of photos) {
        const urlKey = normalizePhotoUrl(photo.fullUrl ?? photo.largeUrl ?? photo.mediumUrl ?? photo.thumbnailUrl ?? photo.url);
        const dedupeKey = photo.providerPhotoRef
            ? `${photo.provider}|ref|${photo.providerPhotoRef}`
            : urlKey
                ? `${photo.provider}|url|${urlKey}`
                : photo.sourcePhotoId
                    ? `${photo.provider}|source|${photo.sourcePhotoId}`
                    : undefined;
        const key = dedupeKey || photo.canonicalPhotoId;
        const existing = deduped.get(key);
        if (!existing) {
            deduped.set(key, photo);
            continue;
        }
        const existingQuality = existing.qualityScore ?? 0;
        const candidateQuality = photo.qualityScore ?? 0;
        if (candidateQuality > existingQuality) {
            deduped.set(key, { ...photo, isPrimary: photo.isPrimary || existing.isPrimary });
            continue;
        }
        if (candidateQuality === existingQuality) {
            const existingScore = existing.rankScore ?? rankPhoto(existing);
            const candidateScore = photo.rankScore ?? rankPhoto(photo);
            if (candidateScore > existingScore) {
                deduped.set(key, photo);
            }
        }
    }
    return [...deduped.values()]
        .sort((a, b) => {
        const aScore = a.rankScore ?? rankPhoto(a);
        const bScore = b.rankScore ?? rankPhoto(b);
        if (bScore !== aScore) {
            return bScore - aScore;
        }
        return a.canonicalPhotoId.localeCompare(b.canonicalPhotoId);
    })
        .map((photo, index) => ({
        ...photo,
        sortOrder: index,
        rankScore: photo.rankScore ?? rankPhoto(photo),
        isPrimary: index === 0
    }));
}
export function selectBestPhotoUrl(photo, preferred = "medium") {
    if (preferred === "thumbnail") {
        return photo.thumbnailUrl ?? photo.mediumUrl ?? photo.url ?? photo.largeUrl ?? photo.fullUrl;
    }
    if (preferred === "full") {
        return photo.fullUrl ?? photo.largeUrl ?? photo.url ?? photo.mediumUrl ?? photo.thumbnailUrl;
    }
    return photo.mediumUrl ?? photo.url ?? photo.largeUrl ?? photo.fullUrl ?? photo.thumbnailUrl;
}
