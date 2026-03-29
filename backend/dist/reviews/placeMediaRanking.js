const rankingConfig = {
    weights: {
        place_detail_hero: {
            quality: 0.3,
            relevance: 0.3,
            trust: 0.2,
            freshness: 0.08,
            engagement: 0.12,
            diversityPenaltyPerPriorFromAuthor: 0.12,
            videoPenalty: 0.07,
            videoBoost: 0.04
        },
        place_detail_gallery: {
            quality: 0.27,
            relevance: 0.25,
            trust: 0.16,
            freshness: 0.12,
            engagement: 0.2,
            diversityPenaltyPerPriorFromAuthor: 0.16,
            videoPenalty: 0,
            videoBoost: 0
        },
        place_video_section: {
            quality: 0.2,
            relevance: 0.24,
            trust: 0.2,
            freshness: 0.16,
            engagement: 0.2,
            diversityPenaltyPerPriorFromAuthor: 0.1,
            videoPenalty: -0.18,
            videoBoost: 0.1
        },
        search_result_card: {
            quality: 0.34,
            relevance: 0.34,
            trust: 0.18,
            freshness: 0.06,
            engagement: 0.08,
            diversityPenaltyPerPriorFromAuthor: 0.1,
            videoPenalty: 0.1,
            videoBoost: 0
        }
    },
    freshnessHalfLifeDays: {
        place_detail_hero: 45,
        place_detail_gallery: 28,
        place_video_section: 18,
        search_result_card: 35
    },
    duplicatePenalty: 0.24,
    nearDuplicatePenalty: 0.08,
    maxTrustBoost: 1,
    maxEngagementBoost: 1,
    maxFreshnessBoost: 1
};
function clamp01(value) {
    if (!Number.isFinite(value))
        return 0;
    return Math.max(0, Math.min(1, value));
}
function normalizedLog(value, scale) {
    if (!Number.isFinite(value) || value <= 0)
        return 0;
    return Math.min(1, Math.log1p(value) / Math.log1p(scale));
}
function qualityScore(item) {
    if (item.quality.processingState && item.quality.processingState !== "ready")
        return 0;
    const pixels = (item.quality.width ?? 0) * (item.quality.height ?? 0);
    const resolution = normalizedLog(pixels, 2_500_000);
    const aspectRatio = item.quality.width && item.quality.height
        ? item.quality.width / item.quality.height
        : undefined;
    const aspectSuitability = aspectRatio
        ? Math.max(0, 1 - Math.min(1, Math.abs(aspectRatio - 1.4) / 1.6))
        : 0.45;
    const thumbnailQuality = item.mediaType === "video"
        ? (item.quality.hasPoster || item.quality.hasThumbnail ? 1 : 0)
        : (item.quality.hasThumbnail || Boolean(item.imageUrl) ? 1 : 0.2);
    const blur = item.quality.blurScore != null ? clamp01(1 - item.quality.blurScore) : 0.6;
    const vision = item.quality.visionQualityScore != null ? clamp01(item.quality.visionQualityScore) : 0.5;
    const durationScore = item.mediaType === "video"
        ? clamp01((item.quality.durationMs ?? 0) / 45_000)
        : 1;
    const primaryAsset = item.mediaType === "video"
        ? (item.quality.hasPlayableVideo || Boolean(item.playbackUrl) ? 1 : 0)
        : (item.quality.hasPrimaryAsset || Boolean(item.imageUrl) ? 1 : 0);
    return clamp01((resolution * 0.28) + (aspectSuitability * 0.18) + (thumbnailQuality * 0.14) + (blur * 0.12) + (vision * 0.1) + (durationScore * 0.08) + (primaryAsset * 0.1));
}
function relevanceScore(item) {
    const assoc = item.placeAssociationConfidence != null ? clamp01(item.placeAssociationConfidence) : 0.85;
    const categoryFit = item.categoryRelevanceScore != null ? clamp01(item.categoryRelevanceScore) : 0.6;
    const captionSignal = item.caption || item.title ? 0.08 : 0;
    const hint = item.relevanceScoreHint != null ? clamp01(item.relevanceScoreHint) : 0.55;
    return clamp01((assoc * 0.45) + (categoryFit * 0.3) + (hint * 0.2) + captionSignal);
}
function trustScore(item) {
    const trusted = item.trust.isTrusted ? 0.28 : 0;
    const verified = item.trust.isVerifiedVisit ? 0.22 : 0;
    const businessVerified = item.trust.isBusinessVerifiedOrigin ? 0.1 : 0;
    const profileTrust = clamp01(item.author.uploaderTrustScore ?? 0.45) * 0.2;
    const moderationConfidence = clamp01(item.trust.moderationConfidence ?? 0.8) * 0.15;
    const trustWeight = clamp01((item.trust.reviewTrustWeight ?? 0) / 50) * 0.12;
    const abusePenalty = clamp01((item.trust.abusePenalty ?? 0) + (item.author.historicalSpamPenalty ?? 0)) * 0.3;
    return clamp01(Math.min(rankingConfig.maxTrustBoost, trusted + verified + businessVerified + profileTrust + moderationConfidence + trustWeight) - abusePenalty);
}
function freshnessScore(item, surface) {
    const createdMs = Date.parse(item.createdAt);
    if (!Number.isFinite(createdMs))
        return 0.3;
    const ageDays = Math.max(0, (Date.now() - createdMs) / 86_400_000);
    const halfLife = rankingConfig.freshnessHalfLifeDays[surface];
    const decay = Math.pow(0.5, ageDays / halfLife);
    const evergreenFloor = 0.28;
    return clamp01(Math.min(rankingConfig.maxFreshnessBoost, evergreenFloor + (1 - evergreenFloor) * decay));
}
function engagementScore(item) {
    const views = item.engagement.views ?? item.engagement.impressions ?? 0;
    const helpful = item.engagement.helpfulVotes ?? 0;
    const saves = item.engagement.saves ?? 0;
    const reports = item.engagement.reports ?? 0;
    const hides = item.engagement.hides ?? 0;
    const skips = item.engagement.skips ?? 0;
    const positive = normalizedLog((helpful * 2) + (saves * 2) + views, 600);
    const completion = item.mediaType === "video"
        ? clamp01((item.engagement.watchCompletionRate ?? 0.35) * 0.8 + normalizedLog(item.engagement.watchCompletions ?? 0, 120) * 0.2)
        : 0.55;
    const negative = normalizedLog((reports * 3) + (hides * 2) + skips, 40);
    const smoothed = clamp01((positive * 0.55) + (completion * 0.25) - (negative * 0.5) + 0.25);
    const confidence = clamp01(normalizedLog(views, 80));
    const prior = 0.45;
    return clamp01(Math.min(rankingConfig.maxEngagementBoost, (smoothed * confidence) + (prior * (1 - confidence))));
}
function duplicateKey(item) {
    return item.fingerprint
        ?? item.playbackUrl
        ?? item.imageUrl
        ?? item.posterUrl
        ?? `${item.sourceType}:${item.sourceId ?? item.id}`;
}
function nearDuplicateKey(item) {
    const ratioBucket = item.quality.width && item.quality.height
        ? `${Math.round((item.quality.width / item.quality.height) * 10)}`
        : "r0";
    const caption = `${item.caption ?? ""}|${item.title ?? ""}`.trim().toLowerCase().slice(0, 42);
    return `${item.author.profileId}|${item.mediaType}|${ratioBucket}|${caption}`;
}
function isDisplayable(item) {
    if (item.moderation.isDeleted || item.moderation.isPrivate || item.moderation.legalBlocked)
        return false;
    if (item.moderation.removedAt)
        return false;
    if (item.moderation.moderationState && item.moderation.moderationState !== "published")
        return false;
    if (item.moderation.visibilityState && item.moderation.visibilityState !== "public")
        return false;
    if (item.quality.processingState && item.quality.processingState !== "ready")
        return false;
    if (item.mediaType === "video") {
        if (!item.playbackUrl && !item.quality.hasPlayableVideo)
            return false;
    }
    else if (!item.imageUrl && !item.thumbnailUrl) {
        return false;
    }
    return true;
}
export function scorePlaceMediaItem(item, surface, debug = false) {
    const weights = rankingConfig.weights[surface];
    const quality = qualityScore(item);
    const relevance = relevanceScore(item);
    const trust = trustScore(item);
    const freshness = freshnessScore(item, surface);
    const engagement = engagementScore(item);
    const mediaTypeAdjustment = item.mediaType === "video"
        ? (-weights.videoPenalty + weights.videoBoost)
        : 0;
    const spamPenalty = clamp01((item.trust.abusePenalty ?? 0) + (item.author.historicalSpamPenalty ?? 0)) * -0.35;
    const manualBoost = 0;
    const total = (weights.quality * quality) +
        (weights.relevance * relevance) +
        (weights.trust * trust) +
        (weights.freshness * freshness) +
        (weights.engagement * engagement) +
        mediaTypeAdjustment +
        spamPenalty +
        manualBoost;
    const breakdown = debug ? {
        total,
        quality: weights.quality * quality,
        relevance: weights.relevance * relevance,
        trust: weights.trust * trust,
        freshness: weights.freshness * freshness,
        engagement: weights.engagement * engagement,
        duplicatePenalty: 0,
        spamPenalty,
        manualBoost,
        diversityAdjustment: 0
    } : undefined;
    return { item, score: total, breakdown };
}
export function rankPlaceMedia(params) {
    const { placeId, mediaItems, surface, debug = false } = params;
    const scoped = mediaItems.filter((item) => item.placeId === placeId && isDisplayable(item));
    const exactSeen = new Set();
    const nearCounts = new Map();
    const deduped = scoped.filter((item) => {
        const key = duplicateKey(item);
        if (exactSeen.has(key))
            return false;
        exactSeen.add(key);
        return true;
    });
    const scored = deduped.map((item) => {
        const ranked = scorePlaceMediaItem(item, surface, debug);
        const nearKey = nearDuplicateKey(item);
        const nearCount = nearCounts.get(nearKey) ?? 0;
        const nearPenalty = nearCount * rankingConfig.nearDuplicatePenalty;
        nearCounts.set(nearKey, nearCount + 1);
        const duplicatePenalty = nearPenalty + ((nearCount > 0 ? 1 : 0) * rankingConfig.duplicatePenalty);
        ranked.score -= duplicatePenalty;
        if (ranked.breakdown) {
            ranked.breakdown.duplicatePenalty = -duplicatePenalty;
            ranked.breakdown.total = ranked.score;
        }
        return ranked;
    });
    scored.sort((a, b) => {
        if (b.score !== a.score)
            return b.score - a.score;
        const dateCmp = b.item.createdAt.localeCompare(a.item.createdAt);
        if (dateCmp !== 0)
            return dateCmp;
        return a.item.id.localeCompare(b.item.id);
    });
    const authorCounts = new Map();
    const typeCounts = new Map();
    const diversified = [];
    const pool = [...scored];
    while (pool.length > 0) {
        let bestIndex = 0;
        let bestEffective = -Infinity;
        for (let i = 0; i < pool.length; i += 1) {
            const candidate = pool[i];
            const authorCount = authorCounts.get(candidate.item.author.profileId) ?? 0;
            const priorType = typeCounts.get(candidate.item.mediaType) ?? 0;
            const preferredPenalty = params.preferredMediaType && params.preferredMediaType !== candidate.item.mediaType ? 0.03 : 0;
            const diversityPenalty = (rankingConfig.weights[surface].diversityPenaltyPerPriorFromAuthor * authorCount) + (priorType > 0 ? 0.02 * priorType : 0) + preferredPenalty;
            const effective = candidate.score - diversityPenalty;
            if (effective > bestEffective) {
                bestEffective = effective;
                bestIndex = i;
            }
        }
        const [picked] = pool.splice(bestIndex, 1);
        if (!picked)
            continue;
        if (picked.breakdown) {
            const authorCount = authorCounts.get(picked.item.author.profileId) ?? 0;
            const priorType = typeCounts.get(picked.item.mediaType) ?? 0;
            picked.breakdown.diversityAdjustment = -((rankingConfig.weights[surface].diversityPenaltyPerPriorFromAuthor * authorCount) + (priorType > 0 ? 0.02 * priorType : 0));
            picked.breakdown.total = picked.score + picked.breakdown.diversityAdjustment;
        }
        diversified.push(picked);
        authorCounts.set(picked.item.author.profileId, (authorCounts.get(picked.item.author.profileId) ?? 0) + 1);
        typeCounts.set(picked.item.mediaType, (typeCounts.get(picked.item.mediaType) ?? 0) + 1);
    }
    return diversified.slice(0, Math.max(1, Math.min(params.limit ?? diversified.length, diversified.length)));
}
export function selectPlaceHeroMedia(placeId, mediaItems, debug = false) {
    const ranked = rankPlaceMedia({ placeId, mediaItems, surface: "place_detail_hero", limit: 20, debug });
    const bestPhoto = ranked.find((entry) => entry.item.mediaType === "photo" && entry.score > 0.35);
    if (bestPhoto)
        return bestPhoto;
    return ranked[0];
}
export function getPlaceMediaGallery(placeId, mediaItems, limit = 24, debug = false) {
    const ranked = rankPlaceMedia({ placeId, mediaItems, surface: "place_detail_gallery", limit: Math.max(limit, 6), debug });
    if (ranked.length <= 2)
        return ranked.slice(0, limit);
    const topVideo = ranked.find((entry) => entry.item.mediaType === "video");
    if (!topVideo)
        return ranked.slice(0, limit);
    const result = [];
    const consumed = new Set();
    const hero = selectPlaceHeroMedia(placeId, mediaItems, debug);
    if (hero) {
        result.push(hero);
        consumed.add(hero.item.id);
    }
    if (!consumed.has(topVideo.item.id) && result.length < limit) {
        result.push(topVideo);
        consumed.add(topVideo.item.id);
    }
    for (const entry of ranked) {
        if (result.length >= limit)
            break;
        if (consumed.has(entry.item.id))
            continue;
        result.push(entry);
    }
    return result;
}
export function getPlaceCardMedia(placeId, mediaItems, debug = false) {
    return rankPlaceMedia({ placeId, mediaItems, surface: "search_result_card", limit: 1, preferredMediaType: "photo", debug })[0];
}
export function getPlaceVideoShelf(placeId, mediaItems, limit = 12, debug = false) {
    return rankPlaceMedia({
        placeId,
        mediaItems: mediaItems.filter((item) => item.mediaType === "video"),
        surface: "place_video_section",
        limit,
        preferredMediaType: "video",
        debug
    });
}
