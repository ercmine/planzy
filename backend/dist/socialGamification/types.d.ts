export type SocialVisibility = "private" | "followers" | "public";
export type SocialChallengeMode = "collaborative" | "competitive";
export type SocialChallengeStatus = "active" | "completed" | "expired";
export type SocialContributionEventType = "review_created" | "video_published" | "place_saved" | "collection_completed";
export interface SocialAudience {
    ownerUserId: string;
    participantUserIds: string[];
    followerScoped?: boolean;
}
export interface SocialContributionRule {
    eventType: SocialContributionEventType;
    points: number;
    distinctPlacesOnly?: boolean;
    minTrustScore?: number;
    allowedContentStates?: Array<"published" | "approved">;
    maxDailyEvents?: number;
    requireCanonicalPlaceId?: boolean;
}
export interface FriendChallengeDefinition {
    id: string;
    slug: string;
    title: string;
    description: string;
    mode: SocialChallengeMode;
    visibility: SocialVisibility;
    durationDays: number;
    targetPoints: number;
    rewardXp: number;
    rules: SocialContributionRule[];
    createdAt: string;
    updatedAt: string;
}
export interface FriendChallengeInstance {
    id: string;
    definitionId: string;
    audience: SocialAudience;
    inviteState: "pending" | "accepted" | "declined";
    status: SocialChallengeStatus;
    startsAt: string;
    endsAt: string;
    participantProgress: Record<string, {
        points: number;
        distinctPlaceIds: string[];
        completedAt?: string;
    }>;
    winnerUserId?: string;
    trustFlags: string[];
    createdAt: string;
    updatedAt: string;
}
export interface CollaborativeGoalDefinition {
    id: string;
    title: string;
    scope: {
        cityId: string;
        neighborhoodId?: string;
        categoryId?: string;
    };
    visibility: SocialVisibility;
    startsAt: string;
    endsAt: string;
    targetPoints: number;
    rules: SocialContributionRule[];
    rewardBadgeId?: string;
}
export interface CollaborativeGoalProgress {
    goalId: string;
    currentPoints: number;
    targetPoints: number;
    percentComplete: number;
    participantCount: number;
    topContributors: Array<{
        userId: string;
        points: number;
    }>;
    completedAt?: string;
}
export interface ShareableMoment {
    id: string;
    userId: string;
    type: "badge" | "challenge_completion" | "city_goal" | "collection" | "creator_milestone";
    title: string;
    subtitle: string;
    imageKey: string;
    privacy: SocialVisibility;
    metadata: Record<string, string | number | boolean>;
    createdAt: string;
}
export interface LightweightCompetitionSummary {
    userId: string;
    circleType: "followers" | "city";
    metric: "weekly_points";
    percentile: number;
    rank: number;
    totalParticipants: number;
    aheadOfCount: number;
}
export interface SocialActionEvent {
    eventId: string;
    actorUserId: string;
    type: SocialContributionEventType;
    canonicalPlaceId?: string;
    cityId?: string;
    neighborhoodId?: string;
    categoryIds?: string[];
    contentState?: "published" | "approved" | "hidden" | "rejected";
    trustScore?: number;
    suspicious?: boolean;
    occurredAt?: string;
}
export interface SocialFeedResponse {
    generatedAt: string;
    friendChallenges: FriendChallengeInstance[];
    collaborativeGoals: Array<CollaborativeGoalDefinition & {
        progress: CollaborativeGoalProgress;
    }>;
    recentMoments: ShareableMoment[];
    competition?: LightweightCompetitionSummary;
}
export interface SocialPrivacySettings {
    userId: string;
    allowChallengeInvites: boolean;
    allowCompetition: boolean;
    defaultShareVisibility: SocialVisibility;
}
