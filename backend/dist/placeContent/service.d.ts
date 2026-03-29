import type { PlaceContentStore } from "./store.js";
import type { ContentEngagementRecord, CreatorVideoRecord, FirstPartyPlaceMetrics, GuideRecord, PremiumPlaceDetailContent, ReviewRecord } from "./types.js";
interface PlaceContentLogger {
    info?(event: string, payload: Record<string, unknown>): void;
}
export declare class PlaceContentService {
    private readonly store;
    private readonly logger?;
    constructor(store: PlaceContentStore, logger?: PlaceContentLogger | undefined);
    createReview(input: {
        canonicalPlaceId: string;
        authorUserId: string;
        authorProfileId?: string;
        body: string;
        rating?: number;
        status?: ReviewRecord["status"];
        visibility?: ReviewRecord["visibility"];
        trustedReview?: boolean;
        qualityScore?: number;
        verifiedVisitScore?: number;
    }): Promise<ReviewRecord>;
    createCreatorVideo(input: {
        canonicalPlaceId: string;
        authorUserId: string;
        mediaAssetId: string;
        thumbnailAssetId?: string;
        title?: string;
        caption?: string;
        durationSec?: number;
        status?: CreatorVideoRecord["status"];
        visibility?: CreatorVideoRecord["visibility"];
        qualityScore?: number;
        publishedAt?: string;
    }): Promise<CreatorVideoRecord>;
    savePlace(input: {
        userId: string;
        canonicalPlaceId: string;
        sourceContext?: "search" | "place_detail" | "guide" | "feed" | "other";
    }): Promise<import("./types.js").PlaceSaveRecord>;
    unsavePlace(userId: string, canonicalPlaceId: string): Promise<void>;
    createGuide(input: {
        ownerUserId: string;
        title: string;
        description?: string;
        visibility?: GuideRecord["visibility"];
        status?: GuideRecord["status"];
        coverAssetId?: string;
    }): Promise<GuideRecord>;
    addGuidePlace(input: {
        guideId: string;
        canonicalPlaceId: string;
        note?: string;
    }): Promise<void>;
    recordEngagement(input: Omit<ContentEngagementRecord, "id">): Promise<void>;
    getPlaceDetailContent(canonicalPlaceId: string): Promise<{
        reviews: ReviewRecord[];
        videos: CreatorVideoRecord[];
        saveCount: number;
        guides: GuideRecord[];
        metrics: FirstPartyPlaceMetrics | undefined;
    }>;
    getPremiumPlaceDetailContent(canonicalPlaceId: string): Promise<PremiumPlaceDetailContent>;
    getCreatorContent(authorUserId: string): Promise<{
        reviews: ReviewRecord[];
        videos: CreatorVideoRecord[];
        guides: GuideRecord[];
    }>;
    getPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics | undefined>;
    getRankingBoost(canonicalPlaceId: string): Promise<import("./types.js").FirstPartyRankingSignals | undefined>;
    refreshPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics>;
}
export {};
