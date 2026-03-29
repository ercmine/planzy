export type PlaceMediaType = "photo" | "video";
export type PlaceMediaSurface = "place_detail_hero" | "place_detail_gallery" | "place_video_section" | "search_result_card";
export interface PlaceMediaAuthorSummary {
    profileId: string;
    profileType: "PERSONAL" | "CREATOR" | "BUSINESS";
    uploaderTrustScore?: number;
    historicalSpamPenalty?: number;
}
export interface PlaceMediaTrustMetadata {
    isTrusted?: boolean;
    isVerifiedVisit?: boolean;
    moderationConfidence?: number;
    reviewTrustWeight?: number;
    isBusinessVerifiedOrigin?: boolean;
    abusePenalty?: number;
}
export interface PlaceMediaEngagement {
    impressions?: number;
    views?: number;
    helpfulVotes?: number;
    saves?: number;
    watchCompletions?: number;
    watchCompletionRate?: number;
    watchTimeMs?: number;
    reports?: number;
    hides?: number;
    skips?: number;
}
export interface PlaceMediaTechnicalQuality {
    width?: number;
    height?: number;
    durationMs?: number;
    fileSizeBytes?: number;
    hasThumbnail?: boolean;
    hasPoster?: boolean;
    hasPlayableVideo?: boolean;
    hasPrimaryAsset?: boolean;
    processingState?: "upload_pending" | "uploaded" | "queued" | "processing" | "ready" | "failed";
    blurScore?: number;
    visionQualityScore?: number;
}
export interface PlaceMediaModerationVisibility {
    moderationState?: "pending" | "published" | "hidden" | "removed" | "flagged";
    visibilityState?: "owner_only" | "public" | "blocked";
    isDeleted?: boolean;
    removedAt?: string;
    isPrivate?: boolean;
    legalBlocked?: boolean;
}
export interface PlaceMediaCandidate {
    id: string;
    mediaType: PlaceMediaType;
    placeId: string;
    reviewId?: string;
    sourceType: "review_user" | "review_creator" | "review_business" | "provider" | "business_curated" | "trusted";
    sourceId?: string;
    playbackUrl?: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    imageUrl?: string;
    caption?: string;
    title?: string;
    createdAt: string;
    updatedAt?: string;
    relevanceScoreHint?: number;
    placeAssociationConfidence?: number;
    categoryRelevanceScore?: number;
    author: PlaceMediaAuthorSummary;
    trust: PlaceMediaTrustMetadata;
    engagement: PlaceMediaEngagement;
    quality: PlaceMediaTechnicalQuality;
    moderation: PlaceMediaModerationVisibility;
    fingerprint?: string;
}
export interface PlaceMediaScoreBreakdown {
    total: number;
    quality: number;
    relevance: number;
    trust: number;
    freshness: number;
    engagement: number;
    duplicatePenalty: number;
    spamPenalty: number;
    manualBoost: number;
    diversityAdjustment: number;
}
export interface RankedPlaceMediaItem {
    item: PlaceMediaCandidate;
    score: number;
    breakdown?: PlaceMediaScoreBreakdown;
}
export declare function scorePlaceMediaItem(item: PlaceMediaCandidate, surface: PlaceMediaSurface, debug?: boolean): RankedPlaceMediaItem;
export declare function rankPlaceMedia(params: {
    placeId: string;
    mediaItems: PlaceMediaCandidate[];
    surface: PlaceMediaSurface;
    limit?: number;
    debug?: boolean;
    preferredMediaType?: PlaceMediaType;
}): RankedPlaceMediaItem[];
export declare function selectPlaceHeroMedia(placeId: string, mediaItems: PlaceMediaCandidate[], debug?: boolean): RankedPlaceMediaItem | undefined;
export declare function getPlaceMediaGallery(placeId: string, mediaItems: PlaceMediaCandidate[], limit?: number, debug?: boolean): RankedPlaceMediaItem[];
export declare function getPlaceCardMedia(placeId: string, mediaItems: PlaceMediaCandidate[], debug?: boolean): RankedPlaceMediaItem | undefined;
export declare function getPlaceVideoShelf(placeId: string, mediaItems: PlaceMediaCandidate[], limit?: number, debug?: boolean): RankedPlaceMediaItem[];
