import { getPlaceVideoShelf } from "./placeMediaRanking.js";
function decodeCursor(cursor) {
    if (!cursor)
        return 0;
    const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
function encodeCursor(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64url");
}
function labelsFor(review) {
    const labels = [];
    if (review.authorProfileType === "CREATOR")
        labels.push("creator_review");
    if (review.trust.reviewTrustDesignation === "trusted" || review.trust.reviewTrustDesignation === "trusted_verified")
        labels.push("trusted");
    if (review.trust.isVerifiedVisit)
        labels.push("verified_visit");
    return labels;
}
function toVideoCandidate(review, media) {
    if (media.mediaType !== "video")
        return null;
    const candidate = {
        id: media.id,
        reviewId: review.id,
        placeId: review.placeId,
        mediaType: "video",
        sourceType: review.authorProfileType === "CREATOR" ? "review_creator" : review.authorProfileType === "BUSINESS" ? "review_business" : "review_user",
        sourceId: review.id,
        playbackUrl: media.playbackUrl,
        thumbnailUrl: media.variants.thumbnailUrl,
        posterUrl: media.posterUrl,
        caption: media.caption,
        title: media.caption,
        createdAt: review.createdAt,
        updatedAt: media.updatedAt,
        relevanceScoreHint: 0.8,
        placeAssociationConfidence: 1,
        categoryRelevanceScore: 0.72,
        author: {
            profileId: review.authorProfileId,
            profileType: review.authorProfileType,
            uploaderTrustScore: Math.min(1, 0.35 + (review.trust.rankingBoostWeight / 100)),
            historicalSpamPenalty: 0
        },
        trust: {
            isTrusted: ["trusted", "trusted_verified"].includes(review.trust.reviewTrustDesignation),
            isVerifiedVisit: review.trust.isVerifiedVisit,
            moderationConfidence: media.moderationState === "published" ? 1 : 0,
            reviewTrustWeight: review.trust.rankingBoostWeight,
            isBusinessVerifiedOrigin: review.authorProfileType === "BUSINESS",
            abusePenalty: 0
        },
        engagement: {
            views: review.helpfulCount * 8,
            helpfulVotes: review.helpfulCount,
            saves: Math.floor(review.helpfulCount * 0.35),
            watchCompletionRate: media.durationMs ? Math.max(0.3, Math.min(0.95, 25_000 / media.durationMs)) : 0.55,
            watchCompletions: Math.floor(review.helpfulCount * 0.6),
            reports: 0,
            hides: 0,
            skips: 0
        },
        quality: {
            width: media.width,
            height: media.height,
            durationMs: media.durationMs,
            fileSizeBytes: media.fileSizeBytes,
            hasThumbnail: Boolean(media.variants.thumbnailUrl),
            hasPoster: Boolean(media.posterUrl),
            hasPlayableVideo: Boolean(media.playbackUrl),
            hasPrimaryAsset: Boolean(media.playbackUrl),
            processingState: media.processingState
        },
        moderation: {
            moderationState: media.moderationState,
            visibilityState: media.visibilityState,
            removedAt: media.removedAt,
            isDeleted: Boolean(media.removedAt),
            isPrivate: media.visibilityState !== "public"
        },
        fingerprint: media.playbackUrl || media.checksum || `${review.authorProfileId}:${media.id}`
    };
    return { candidate, review, media };
}
function toVideoItem(entry, sourceMap, includeDebug) {
    const source = sourceMap.get(entry.item.id);
    if (!source) {
        throw new Error(`missing ranked video source for media ${entry.item.id}`);
    }
    const { review, media } = source;
    return {
        id: media.id,
        reviewId: review.id,
        placeId: review.placeId,
        playbackUrl: media.playbackUrl,
        thumbnailUrl: media.variants.thumbnailUrl,
        posterUrl: media.posterUrl,
        durationMs: media.durationMs,
        title: media.caption,
        caption: media.caption,
        createdAt: review.createdAt,
        author: {
            profileId: review.authorProfileId,
            profileType: review.authorProfileType,
            displayName: review.author.displayName,
            handle: review.author.handle,
            avatarUrl: review.author.avatarUrl
        },
        badges: review.trust.trustBadges,
        labels: labelsFor(review),
        helpfulCount: review.helpfulCount,
        trustRank: review.trust.rankingBoostWeight,
        debugScoreBreakdown: includeDebug ? entry.breakdown : undefined
    };
}
export async function getPlaceReviewVideoSection(store, input) {
    const filter = input.filter ?? "all";
    const perPage = Math.max(1, Math.min(input.limit ?? 12, 30));
    const response = await store.listByPlace({
        placeId: input.placeId,
        viewerUserId: input.viewerUserId,
        sort: "trusted",
        limit: 200
    });
    const sourceMap = new Map();
    const candidates = [];
    for (const review of response.reviews) {
        const include = filter === "all"
            || (filter === "creator" && review.authorProfileType === "CREATOR")
            || (filter === "user" && review.authorProfileType !== "CREATOR")
            || (filter === "trusted" && (review.trust.reviewTrustDesignation === "trusted" || review.trust.reviewTrustDesignation === "trusted_verified"))
            || (filter === "verified" && review.trust.isVerifiedVisit);
        if (!include)
            continue;
        for (const media of review.media) {
            const wrapped = toVideoCandidate(review, media);
            if (!wrapped)
                continue;
            candidates.push(wrapped.candidate);
            sourceMap.set(wrapped.candidate.id, wrapped);
        }
    }
    const rankedShelf = getPlaceVideoShelf(input.placeId, candidates, 200, Boolean(input.debugScores));
    const start = decodeCursor(input.cursor);
    const page = rankedShelf.slice(start, start + perPage);
    const nextOffset = start + page.length;
    const videos = page.map((entry) => toVideoItem(entry, sourceMap, Boolean(input.debugScores)));
    const featuredRanked = rankedShelf.find((entry) => {
        const source = sourceMap.get(entry.item.id);
        if (!source)
            return false;
        return source.review.authorProfileType === "CREATOR"
            || source.review.trust.reviewTrustDesignation === "trusted"
            || source.review.trust.reviewTrustDesignation === "trusted_verified"
            || source.review.trust.isVerifiedVisit;
    }) ?? rankedShelf[0];
    const featuredVideo = featuredRanked ? toVideoItem(featuredRanked, sourceMap, Boolean(input.debugScores)) : undefined;
    return {
        placeId: input.placeId,
        featuredVideo,
        videos,
        nextCursor: nextOffset < rankedShelf.length ? encodeCursor(nextOffset) : undefined,
        totalVisibleVideos: rankedShelf.length
    };
}
