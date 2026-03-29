import type { VideoAsset, VideoFeedItem, FeedScope, FeedScopeProfile, FeedScopeRequestContext, PlaceFeedSignals, CreatorFeedSignals, VideoFeedCursorPayload, FeedObservabilityEvent, FeedScoreComponents } from "./types.js";
export declare const FEED_SCOPE_PROFILES: Record<FeedScope, FeedScopeProfile>;
export interface FeedRankCandidate {
    video: VideoAsset;
    place: PlaceFeedSignals;
    creator: CreatorFeedSignals;
    localityScore: number;
    scoreComponents: FeedScoreComponents;
    rawScore: number;
}
export interface FeedRankingInput {
    scope: FeedScope;
    allVideos: VideoAsset[];
    context?: FeedScopeRequestContext;
    placeSignalsFor: (placeId: string) => PlaceFeedSignals;
    creatorSignalsFor: (creatorId: string) => CreatorFeedSignals;
    cursor?: string;
    limit: number;
}
export interface FeedRankingOutput {
    ranked: Array<{
        item: VideoFeedItem;
        sortKey: string;
    }>;
    nextCursor?: string;
    observability: FeedObservabilityEvent;
}
export declare function rankPlaceLinkedVideoFeed(input: FeedRankingInput): FeedRankingOutput;
export declare function encodeCursor(payload: VideoFeedCursorPayload): string;
export declare function decodeCursor(raw?: string): VideoFeedCursorPayload | undefined;
