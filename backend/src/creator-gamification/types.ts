export type TrustTier = "low" | "developing" | "trusted" | "high";
export type ModerationState = "active" | "pending_review" | "hidden" | "removed" | "rejected";

export type CreatorMilestoneFamily = "streak" | "quality" | "trusted" | "city" | "category" | "district";

export interface CreatorMilestoneDefinition {
  id: string;
  family: CreatorMilestoneFamily;
  title: string;
  threshold: number;
  metric:
    | "daily_streak"
    | "weekly_streak"
    | "quality_publishes"
    | "trusted_reviews"
    | "trusted_clean_days"
    | "city_distinct_places"
    | "city_neighborhoods"
    | "category_distinct_places"
    | "district_distinct_places";
  cityId?: string;
  categoryId?: string;
  districtId?: string;
  minTrustTier?: TrustTier;
}

export interface CreatorShowcaseDefinition {
  id: string;
  title: string;
  family: CreatorMilestoneFamily;
  milestoneIds: string[];
  trustedOnly?: boolean;
}

export interface CreatorGamificationConfig {
  dailyStreakGraceDays: number;
  weeklyStreakGraceWeeks: number;
  minQualityScoreForQualifyingPublish: number;
  minEngagementScoreForQualityPublish: number;
  maxQualifyingPublishesPerDay: number;
  repeatedPlaceCooldownDays: number;
  repeatedPlaceDailyCap: number;
  trustedMilestoneMinTrust: TrustTier;
  showcaseSlots: number;
  milestones: CreatorMilestoneDefinition[];
  showcases: CreatorShowcaseDefinition[];
}

export interface CreatorPublishInput {
  creatorId: string;
  videoId: string;
  canonicalPlaceId: string;
  cityId: string;
  neighborhoodId?: string;
  districtId?: string;
  categoryIds: string[];
  occurredAt?: Date;
  moderationState?: ModerationState;
  trustTier?: TrustTier;
  qualityScore: number;
  engagementScore: number;
  suspicious?: boolean;
  trustedSignals?: {
    helpfulSaves: number;
    verifiedCompletes: number;
  };
}

export type PublishSuppressionReason =
  | "moderation_blocked"
  | "suspicious_activity"
  | "quality_gate"
  | "daily_publish_cap"
  | "repeat_place_cap"
  | "repeat_place_cooldown"
  | "trust_gate";

export interface PublishingStreakState {
  dailyCount: number;
  weeklyCount: number;
  bestDailyCount: number;
  bestWeeklyCount: number;
  lastQualifiedDay?: string;
  lastQualifiedWeek?: string;
}

export interface CreatorMilestoneProgress {
  milestoneId: string;
  progress: number;
  completedAt?: string;
  suppressed?: boolean;
}

export interface CoverageProgress {
  cityPlaceCounts: Record<string, number>;
  cityNeighborhoodCounts: Record<string, number>;
  categoryPlaceCounts: Record<string, number>;
  districtPlaceCounts: Record<string, number>;
}

export interface CreatorPrestigeShowcase {
  showcaseId: string;
  unlockedAt: string;
  featured: boolean;
}

export interface CreatorGamificationProfile {
  creatorId: string;
  qualifyingPublishes: number;
  qualityPublishes: number;
  trustedReviewCount: number;
  cleanContributionDays: number;
  streaks: PublishingStreakState;
  coverage: CoverageProgress;
  milestones: CreatorMilestoneProgress[];
  showcases: CreatorPrestigeShowcase[];
  antiAbuseFlags: PublishSuppressionReason[];
  lastUpdatedAt?: string;
}

export interface CreatorPublishResult {
  qualifies: boolean;
  suppressionReason?: PublishSuppressionReason;
  unlockedMilestones: CreatorMilestoneDefinition[];
  unlockedShowcases: CreatorShowcaseDefinition[];
  profile: CreatorGamificationProfile;
  notifications: string[];
}

export interface CreatorGamificationSummaryDto {
  profile: CreatorGamificationProfile;
  nextMilestones: CreatorMilestoneProgress[];
}

export interface CreatorGamificationAdminSnapshot {
  config: CreatorGamificationConfig;
  suppressionCounts: Partial<Record<PublishSuppressionReason, number>>;
  milestoneCompletionCounts: Record<string, number>;
}
