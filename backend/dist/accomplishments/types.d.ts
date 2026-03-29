export type AccomplishmentTrack = "explorer" | "creator" | "trust" | "collection";
export type AccomplishmentKind = "badge" | "achievement" | "collectible";
export type BadgeRarity = "common" | "rare" | "epic" | "legendary";
export interface AccomplishmentCondition {
    metric: "reviews_count" | "videos_published_count" | "saved_places_count" | "distinct_cities_explored" | "helpful_reviews_count" | "trusted_creator_state" | "trusted_reviews_count" | "creator_streak_days" | "distinct_categories_reviewed";
    threshold: number;
}
export interface CollectibleDefinition {
    collectibleId: string;
    name: string;
    description: string;
    cityId?: string;
    requiredPlaceIds?: string[];
    requiredCategories?: string[];
    requiredCount?: number;
}
export interface AccomplishmentDefinition {
    id: string;
    kind: AccomplishmentKind;
    track: AccomplishmentTrack;
    name: string;
    description: string;
    iconKey: string;
    rarity: BadgeRarity;
    featured?: boolean;
    tiers?: Array<{
        tier: number;
        name: string;
        condition: AccomplishmentCondition;
        xpReward?: number;
    }>;
    condition?: AccomplishmentCondition;
    collectible?: CollectibleDefinition;
    trustGate?: {
        minTrustScore?: number;
        requireTrustedCreator?: boolean;
        maxModerationStrikes?: number;
    };
}
export type ContributionState = "published" | "hidden" | "rejected" | "pending";
export type AccomplishmentEventType = "review_created" | "video_published" | "place_saved" | "place_explored" | "review_helpful" | "trust_state_changed" | "moderation_strike";
export interface AccomplishmentEvent {
    eventId: string;
    userId: string;
    type: AccomplishmentEventType;
    occurredAt?: string;
    canonicalPlaceId?: string;
    cityId?: string;
    categoryId?: string;
    contributionState?: ContributionState;
    trustedCreator?: boolean;
    trustScoreDelta?: number;
    value?: number;
}
export interface UserAccomplishmentState {
    userId: string;
    earnedDefinitionIds: string[];
    tierProgress: Record<string, number>;
    featuredBadgeIds: string[];
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
    collectibleProgress: Record<string, string[]>;
}
export interface UnlockMoment {
    definitionId: string;
    name: string;
    kind: AccomplishmentKind;
    tier?: number;
}
