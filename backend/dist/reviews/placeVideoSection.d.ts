import { type RankedPlaceMediaItem } from "./placeMediaRanking.js";
import type { PlaceReview, ReviewsStore } from "./store.js";
export interface PlaceVideoQueryInput {
    placeId: string;
    viewerUserId?: string;
    cursor?: string;
    limit?: number;
    filter?: "all" | "creator" | "user" | "trusted" | "verified";
    debugScores?: boolean;
}
export interface PlaceVideoAuthorSummary {
    profileId: string;
    profileType: PlaceReview["authorProfileType"];
    displayName: string;
    handle?: string;
    avatarUrl?: string;
}
export interface PlaceReviewVideoItem {
    id: string;
    reviewId: string;
    placeId: string;
    playbackUrl: string;
    thumbnailUrl?: string;
    posterUrl?: string;
    durationMs?: number;
    title?: string;
    caption?: string;
    createdAt: string;
    author: PlaceVideoAuthorSummary;
    badges: string[];
    labels: string[];
    helpfulCount: number;
    trustRank: number;
    debugScoreBreakdown?: RankedPlaceMediaItem["breakdown"];
}
export interface PlaceReviewVideoSection {
    placeId: string;
    featuredVideo?: PlaceReviewVideoItem;
    videos: PlaceReviewVideoItem[];
    nextCursor?: string;
    totalVisibleVideos: number;
}
export declare function getPlaceReviewVideoSection(store: ReviewsStore, input: PlaceVideoQueryInput): Promise<PlaceReviewVideoSection>;
