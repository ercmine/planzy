import type { AnalyticsService } from "../analytics/service.js";
import type { SponsoredVideoRewardPool, UserViewerRewardSummary, ViewerEngagementEvent, ViewerEngagementStore, ViewerRewardAction, ViewerRewardEligibilityDecision, ViewerRewardLedgerEntry, ViewerRewardRule, WatchSession } from "./types.js";
export interface ViewerEngagementDependencies {
    getVideoContext: (videoId: string) => {
        creatorId: string;
        placeId?: string;
    } | null;
    analytics?: AnalyticsService;
}
export declare class ViewerEngagementRewardsService {
    private readonly store;
    private readonly deps;
    private config;
    constructor(store: ViewerEngagementStore, deps: ViewerEngagementDependencies);
    startWatchSession(input: {
        userId: string;
        videoId: string;
        durationMs: number;
        deviceId?: string;
        ipHash?: string;
    }): WatchSession;
    heartbeat(input: {
        userId: string;
        sessionId: string;
        watchMs: number;
        progressMs: number;
        foreground: boolean;
    }): {
        session: WatchSession;
        watchPct: number;
    };
    pauseSession(input: {
        userId: string;
        sessionId: string;
    }): WatchSession;
    completeWatchSession(input: {
        userId: string;
        sessionId: string;
    }): WatchSession;
    submitRating(input: {
        userId: string;
        videoId: string;
        rating: number;
    }): {
        event: ViewerEngagementEvent;
        decision: ViewerRewardEligibilityDecision;
    };
    submitEngagement(input: {
        userId: string;
        videoId: string;
        action: "save" | "share" | "place_click" | "follow_creator" | "playlist_chain";
        metadata?: Record<string, unknown>;
    }): {
        event: ViewerEngagementEvent;
        decision: ViewerRewardEligibilityDecision;
    };
    submitComment(input: {
        userId: string;
        videoId: string;
        text: string;
        parentCommentId?: string;
        moderated?: boolean;
        deleted?: boolean;
    }): {
        event: ViewerEngagementEvent;
        decision: ViewerRewardEligibilityDecision;
    };
    createSponsoredPool(input: Omit<SponsoredVideoRewardPool, "id" | "remainingAtomic"> & {
        id?: string;
    }): SponsoredVideoRewardPool;
    mapVideoToCampaign(input: {
        videoId: string;
        poolId: string;
    }): {
        ok: boolean;
    };
    getEligibility(input: {
        userId: string;
        videoId: string;
        action: ViewerRewardAction;
    }): ViewerRewardEligibilityDecision;
    listViewerRewards(userId: string): ViewerRewardLedgerEntry[];
    getViewerSummary(userId: string): UserViewerRewardSummary;
    getCampaignMetadata(videoId: string): {
        poolId: string;
        campaignId: string;
        sponsorBusinessId: string;
        remainingAtomic: bigint;
        eligibleActions: ViewerRewardAction[];
    } | null;
    listRiskFlags(userId?: string): import("./types.js").ViewerEngagementRiskFlag[];
    reverseReward(input: {
        ledgerEntryId: string;
        actor: string;
        reason: string;
    }): ViewerRewardLedgerEntry;
    updateRule(rule: ViewerRewardRule): ViewerRewardRule;
    listRules(): ViewerRewardRule[];
    private tryRewardStreak;
    private tryRewardAction;
    private evaluateEligibility;
    private computeRiskScore;
    private resolveRewardSource;
    private isMeaningfulWatch;
    private requireOwnedSession;
    private requireVideoContext;
    private saveEvent;
    private getOrCreateSummary;
    private track;
}
