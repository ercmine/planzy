export type CompetitionSeasonStatus = "upcoming" | "active" | "ended";
export type CompetitionMissionType = "first_approved_review_of_day" | "approved_reviews_in_period" | "review_new_place" | "review_category" | "likes_in_48h" | "featured_quality_band" | "streak_days" | "tips_received" | "rank_top_n_city" | "complete_missions_in_week";
export type CompetitionRepeatMode = "once" | "daily" | "weekly" | "seasonal";
export type CompetitionGoalType = "approved_reviews" | "new_places" | "category_reviews" | "early_likes" | "featured_quality" | "streak_days" | "tips_atomic" | "leaderboard_rank" | "missions_completed";
export type CompetitionLeaderboardType = "weekly_global" | "weekly_city" | "weekly_quality" | "weekly_discovery" | "weekly_most_tipped" | "seasonal_overall";
export type CompetitionScopeType = "global" | "city" | "category" | "season";
export type CompetitionRewardStatus = "pending" | "claimable" | "claiming" | "claimed" | "blocked" | "expired";
export type CompetitionRewardSourceType = "mission" | "leaderboard" | "seasonal_bonus" | "featured_challenge";
export type CompetitionQualityBand = "LOW" | "STANDARD" | "HIGH" | "FEATURED";
export type CompetitionEventType = "review_approved" | "place_discovered" | "video_published" | "like_received" | "tip_received" | "streak_updated" | "mission_claimed";
export interface CompetitionSeason {
    id: string;
    name: string;
    status: CompetitionSeasonStatus;
    startsAt: string;
    endsAt: string;
    rewardPoolAtomic: bigint;
    createdAt: string;
    updatedAt: string;
}
export interface CompetitionMission {
    id: string;
    type: CompetitionMissionType;
    title: string;
    description: string;
    rewardAtomic: bigint;
    startsAt: string;
    endsAt: string;
    repeatMode: CompetitionRepeatMode;
    goalType: CompetitionGoalType;
    goalValue: number;
    category?: string;
    city?: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CompetitionMissionProgress {
    id: string;
    missionId: string;
    userId: string;
    progressValue: number;
    completed: boolean;
    completedAt?: string;
    claimed: boolean;
    claimedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface CompetitionLeaderboard {
    id: string;
    type: CompetitionLeaderboardType;
    name: string;
    scopeType: CompetitionScopeType;
    scopeValue?: string;
    startsAt: string;
    endsAt: string;
    rewardPoolAtomic: bigint;
    scoringRuleVersion: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface CompetitionLeaderboardEntry {
    id: string;
    leaderboardId: string;
    userId: string;
    score: number;
    rank: number;
    rewardAtomic?: bigint;
    claimed: boolean;
    claimedAt?: string;
    updatedAt: string;
}
export interface CompetitionVideoQualitySnapshot {
    id: string;
    videoId: string;
    reviewId?: string;
    userId: string;
    publishedAt: string;
    qualityWindowEndsAt: string;
    earlyLikeCount: number;
    qualityBand: CompetitionQualityBand;
    qualityPoints: number;
    finalized: boolean;
    finalizedAt?: string;
    createdAt: string;
    updatedAt: string;
    removed?: boolean;
    blocked?: boolean;
    city?: string;
    category?: string;
    canonicalPlaceId?: string;
}
export interface CompetitionReward {
    id: string;
    userId: string;
    sourceType: CompetitionRewardSourceType;
    sourceId: string;
    rewardAtomic: bigint;
    status: CompetitionRewardStatus;
    claimTransactionSignature?: string;
    createdAt: string;
    updatedAt: string;
    claimedAt?: string;
}
export interface CompetitionAuditLog {
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    payload: Record<string, unknown>;
    createdAt: string;
}
export interface CompetitionLikeEvent {
    id: string;
    videoId: string;
    userId: string;
    createdAt: string;
    valid: boolean;
    bannedUser: boolean;
    blockedUser: boolean;
    fraudFlagged: boolean;
}
export interface CompetitionTipEvent {
    id: string;
    userId: string;
    amountAtomic: bigint;
    createdAt: string;
    videoId?: string;
}
export interface CompetitionReviewEvent {
    id: string;
    reviewId: string;
    videoId: string;
    userId: string;
    canonicalPlaceId: string;
    approvedAt: string;
    category?: string;
    city?: string;
    discoveryType: "first_review" | "first_five" | "under_covered" | "standard";
    approved: boolean;
    blocked: boolean;
}
export interface CompetitionUserProfile {
    userId: string;
    city?: string;
    streakDays: number;
    banned?: boolean;
    blocked?: boolean;
    spamFlagged?: boolean;
}
export interface CompetitionHomeView {
    season: CompetitionSeason | null;
    score: number;
    streakDays: number;
    cityRank?: number;
    claimableRewardAtomic: string;
    missions: CompetitionMissionWithProgress[];
    leaderboards: CompetitionLeaderboardSummary[];
    featuredChallenge?: CompetitionMissionWithProgress;
    rewards: CompetitionReward[];
    rewardHistory: CompetitionReward[];
}
export interface CompetitionMissionWithProgress extends CompetitionMission {
    progress: CompetitionMissionProgress;
}
export interface CompetitionLeaderboardSummary extends CompetitionLeaderboard {
    topEntries: CompetitionLeaderboardEntry[];
    myEntry?: CompetitionLeaderboardEntry;
}
export interface CompetitionScoringConfig {
    enabled: boolean;
    qualityWindowHours: number;
    qualityBands: Array<{
        minLikes: number;
        band: CompetitionQualityBand;
        points: number;
    }>;
    approvedReviewPoints: number;
    discoveryBonusPoints: Record<CompetitionReviewEvent["discoveryType"], number>;
    streakPointPerDay: number;
    tipPointsPerDryad: number;
    missionCompletionPoints: number;
    engagementBonusPoints: number;
    rewardClaimPrefix: string;
}
