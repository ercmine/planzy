export type RuleLifecycle = "draft" | "active" | "archived";
export type MechanicFamily = "xp" | "badge" | "quest" | "streak" | "collection" | "leaderboard";
export type ActionType = "place_saved" | "place_reviewed" | "creator_video_published" | "challenge_completed" | "collection_progressed" | "follow_action" | "helpful_signal";
export interface RuleScope {
    cityId?: string;
    categoryId?: string;
    creatorId?: string;
    experimentId?: string;
}
export interface RuleVersion {
    id: string;
    version: number;
    lifecycle: RuleLifecycle;
    environment: "dev" | "stage" | "prod";
    createdBy: string;
    createdAt: string;
    publishedAt?: string;
    effectiveFrom?: string;
    notes?: string;
    scopes: RuleScope[];
    mechanics: MechanicsConfig;
}
export interface MechanicsConfig {
    xp: {
        maxDailyXp: number;
        trustMultipliers: Array<{
            minTrustScore: number;
            multiplier: number;
        }>;
        rules: XpRule[];
    };
    badges: BadgeRule[];
    quests: QuestRule[];
    streaks: StreakRule[];
    collections: CollectionRule[];
    leaderboard: {
        windowDays: number;
        tieBreaker: "trust_score" | "earliest_reached";
        weights: Array<{
            actionType: ActionType;
            weight: number;
            qualityWeight: number;
        }>;
    };
    antiAbuse: {
        cooldownSecondsByAction: Partial<Record<ActionType, number>>;
        dailyCapsByAction: Partial<Record<ActionType, number>>;
        distinctPlacesRequiredByAction: Partial<Record<ActionType, number>>;
        suppressModeratedContent: boolean;
        suppressLowTrustBelow: number;
    };
}
export interface XpRule {
    id: string;
    actionType: ActionType;
    xp: number;
    track: "explorer" | "creator";
    cooldownSeconds?: number;
    requiresDistinctPlace?: boolean;
}
export interface BadgeRule {
    id: string;
    name: string;
    metric: "xp_total" | "reviews" | "videos" | "trusted_actions";
    threshold: number;
    grantsXp?: number;
    trustGate?: number;
}
export interface QuestRule {
    id: string;
    name: string;
    actionType: ActionType;
    targetCount: number;
    rewardXp: number;
    startAt: string;
    endAt: string;
    distinctPlacesRequired?: number;
}
export interface StreakRule {
    id: string;
    name: string;
    actionType: ActionType;
    windowDays: number;
    graceDays: number;
    milestones: number[];
}
export interface CollectionRule {
    id: string;
    name: string;
    requiredPlaceCount: number;
    cityId?: string;
    categoryId?: string;
    rewardXp: number;
}
export interface GamificationEvent {
    eventId: string;
    dedupeKey?: string;
    userId: string;
    actionType: ActionType;
    occurredAt: string;
    canonicalPlaceId?: string;
    cityId?: string;
    categoryId?: string;
    trustScore: number;
    moderationState?: "approved" | "hidden" | "rejected";
    qualityScore?: number;
    source: "app" | "backend" | "admin_recompute";
}
export interface RewardDecision {
    decisionId: string;
    userId: string;
    eventId: string;
    ruleVersionId: string;
    awardedXp: number;
    suppressed: boolean;
    reasons: string[];
    unlockedBadgeIds: string[];
    completedQuestIds: string[];
    streakMilestonesReached: Array<{
        streakId: string;
        days: number;
    }>;
    leaderboardDelta: number;
    createdAt: string;
}
export interface UserGamificationState {
    userId: string;
    totalXp: number;
    xpByTrack: Record<"explorer" | "creator", number>;
    actionCounts: Partial<Record<ActionType, number>>;
    distinctPlacesByAction: Partial<Record<ActionType, string[]>>;
    badgeIds: string[];
    questProgress: Record<string, number>;
    completedQuestIds: string[];
    streaks: Record<string, {
        lastEventDate?: string;
        currentDays: number;
    }>;
    collectionProgress: Record<string, string[]>;
    leaderboardScore: number;
    trustedActions: number;
    reviewCount: number;
    videoCount: number;
    recentDecisionIds: string[];
}
export interface AdminAuditLog {
    id: string;
    actorId: string;
    action: "create_draft" | "publish_rules" | "rollback_rules" | "recompute_user";
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface ProgressionSummaryDto {
    userId: string;
    totalXp: number;
    level: number;
    badges: string[];
    streaks: Record<string, number>;
    questProgress: Record<string, {
        current: number;
        completed: boolean;
    }>;
    leaderboardScore: number;
    recentDecisions: RewardDecision[];
}
