import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { SocialGamificationStore } from "./store.js";
import type { CollaborativeGoalDefinition, SocialActionEvent, SocialFeedResponse, SocialPrivacySettings } from "./types.js";
export declare class SocialGamificationService {
    private readonly store;
    private readonly analytics?;
    private readonly notifications?;
    constructor(store: SocialGamificationStore, analytics?: AnalyticsService | undefined, notifications?: NotificationService | undefined);
    getFeed(userId: string, cityId?: string): SocialFeedResponse;
    upsertGoal(definition: CollaborativeGoalDefinition): CollaborativeGoalDefinition;
    setPrivacy(settings: SocialPrivacySettings): SocialPrivacySettings;
    getPrivacy(userId: string): SocialPrivacySettings;
    recordAction(event: SocialActionEvent): Promise<{
        ignored: boolean;
        blockedReason?: string;
        generatedMomentIds: string[];
    }>;
    private applyToChallengeInstance;
    private pointsForRules;
    private getGoalProgress;
    private getCompetitionSummary;
    private block;
    private createMoment;
}
