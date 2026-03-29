import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { AccomplishmentsStore } from "./store.js";
import type { AccomplishmentDefinition, AccomplishmentEvent, UnlockMoment } from "./types.js";
export declare class AccomplishmentsService {
    private readonly store;
    private readonly analyticsService?;
    private readonly notificationService?;
    constructor(store: AccomplishmentsStore, analyticsService?: AnalyticsService | undefined, notificationService?: NotificationService | undefined);
    getCatalog(): AccomplishmentDefinition[];
    getUserSummary(userId: string): {
        stats: {
            reviewsCount: number;
            videosPublishedCount: number;
            savedPlaceIds: string[];
            exploredCityIds: string[];
            helpfulReviewsCount: number;
            trustedCreator: boolean;
            trustedReviewsCount: number;
            creatorStreakDays: number;
            distinctReviewedCategories: string[];
            moderationStrikes: number;
            trustScore: number;
        };
        earned: AccomplishmentDefinition[];
        featured: AccomplishmentDefinition[];
        progress: {
            definitionId: string;
            current: number;
            target: number | undefined;
            tier: number;
            earned: boolean;
        }[];
        collectibles: Record<string, string[]>;
    };
    setFeaturedBadges(userId: string, badgeIds: string[]): string[];
    recordEvent(event: AccomplishmentEvent): Promise<{
        unlocks: UnlockMoment[];
        ignored: boolean;
    }>;
    private applyEvent;
    private updateCollectibles;
    private evaluateUnlocks;
    private passesTrustGate;
    private metricValue;
}
