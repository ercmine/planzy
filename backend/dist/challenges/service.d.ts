import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { ChallengesStore } from "./store.js";
import type { ChallengeDefinition, ChallengeEvent, ChallengeProgress, QuestHubResponse } from "./types.js";
export declare class ChallengesService {
    private readonly store;
    private readonly analyticsService?;
    private readonly notifications?;
    constructor(store: ChallengesStore, analyticsService?: AnalyticsService | undefined, notifications?: NotificationService | undefined);
    private isActive;
    listAvailable(userId: string, filters?: {
        cityId?: string;
        neighborhoodId?: string;
        categoryId?: string;
        marketId?: string;
        track?: string;
        cadence?: string;
    }): {
        progress: ChallengeProgress;
        id: string;
        slug: string;
        name: string;
        description: string;
        cadence: import("./types.js").ChallengeCadence;
        track: import("./types.js").ChallengeTrack;
        scopeType: import("./types.js").ChallengeScopeType;
        scope: import("./types.js").ChallengeScope;
        status: import("./types.js").ChallengeStatus;
        cityLabel?: string;
        neighborhoodLabel?: string;
        categoryLabels?: string[];
        hotspotLabel?: string;
        marketLabel?: string;
        seasonKey?: string;
        eventTheme?: string;
        startsAt: string;
        endsAt: string;
        timezone: "UTC";
        visibility: "public" | "invite_only";
        criteria: import("./types.js").ChallengeCriterion[];
        reward: import("./types.js").ChallengeReward;
        liveOps: {
            owner: string;
            notes?: string;
            tags?: string[];
            segmentIds?: string[];
            previewOnly?: boolean;
        };
        rotation?: import("./types.js").ChallengeRotation;
        createdAt: string;
        updatedAt: string;
    }[];
    getQuestHub(userId: string, filters?: {
        cityId?: string;
        marketId?: string;
        categoryId?: string;
        track?: string;
    }): QuestHubResponse;
    getSummary(userId: string): {
        totalAvailable: number;
        completed: number;
        inProgress: number;
        weeklyActive: number;
        seasonalActive: number;
        tracks: {
            explorer: number;
            creator: number;
            mixed: number;
        };
        featuredLocales: string[];
    };
    getChallengeDetail(userId: string, challengeId: string): {
        progress: ChallengeProgress;
        id: string;
        slug: string;
        name: string;
        description: string;
        cadence: import("./types.js").ChallengeCadence;
        track: import("./types.js").ChallengeTrack;
        scopeType: import("./types.js").ChallengeScopeType;
        scope: import("./types.js").ChallengeScope;
        status: import("./types.js").ChallengeStatus;
        cityLabel?: string;
        neighborhoodLabel?: string;
        categoryLabels?: string[];
        hotspotLabel?: string;
        marketLabel?: string;
        seasonKey?: string;
        eventTheme?: string;
        startsAt: string;
        endsAt: string;
        timezone: "UTC";
        visibility: "public" | "invite_only";
        criteria: import("./types.js").ChallengeCriterion[];
        reward: import("./types.js").ChallengeReward;
        liveOps: {
            owner: string;
            notes?: string;
            tags?: string[];
            segmentIds?: string[];
            previewOnly?: boolean;
        };
        rotation?: import("./types.js").ChallengeRotation;
        createdAt: string;
        updatedAt: string;
    } | null;
    upsertDefinition(definition: ChallengeDefinition): ChallengeDefinition;
    recordEvent(event: ChallengeEvent): Promise<{
        ignored: boolean;
        completedChallengeIds: string[];
        blockedReason?: string;
    }>;
    private getProgressForChallenge;
    private eventMatchesScope;
    private emitCompletionSignals;
    private trackBlocked;
}
