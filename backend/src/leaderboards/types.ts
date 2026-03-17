import type { TrustTier } from "../trustSafety/types.js";

export type LeaderboardEntityType = "creator" | "explorer" | "city" | "category";
export type LeaderboardWindow = "daily" | "weekly" | "monthly" | "all_time";

export interface LeaderboardDefinition {
  id: string;
  entityType: LeaderboardEntityType;
  title: string;
  formulaVersion: string;
  visibility: "public" | "internal" | "disabled";
}

export type LeaderboardActionType =
  | "video_published"
  | "review_published"
  | "place_saved"
  | "helpful_vote"
  | "follow"
  | "quest_completed"
  | "place_explored";

export interface LeaderboardContributionEvent {
  eventId: string;
  actorUserId: string;
  creatorUserId?: string;
  explorerUserId?: string;
  canonicalPlaceId?: string;
  normalizedCityId?: string;
  normalizedCategoryId?: string;
  actionType: LeaderboardActionType;
  qualityScore?: number;
  engagementScore?: number;
  actorTrustTier?: TrustTier;
  targetTrustTier?: TrustTier;
  moderationState?: "active" | "pending_review" | "hidden" | "removed" | "rejected";
  suspicious?: boolean;
  occurredAt: string;
}

export interface ScoreComponents {
  meaningfulActions: number;
  trustedActions: number;
  qualityPoints: number;
  engagementPoints: number;
  diversityBonus: number;
  consistencyBonus: number;
  antiSpamPenalty: number;
  moderationPenalty: number;
  trustMultiplier: number;
}

export interface LeaderboardScoreSnapshot {
  leaderboardType: LeaderboardEntityType;
  window: LeaderboardWindow;
  entityId: string;
  scopeKey?: string;
  score: number;
  rank: number;
  movementDelta: number;
  scoreComponents: ScoreComponents;
  suppressionFlags: string[];
  formulaVersion: string;
  generatedAt: string;
}

export interface LeaderboardFormula {
  version: string;
  weights: {
    meaningfulAction: number;
    quality: number;
    engagement: number;
    diversity: number;
    consistency: number;
    trust: number;
    antiSpamPenalty: number;
    moderationPenalty: number;
  };
  minimumQualityThreshold: number;
  maxActionsPerPlacePerDay: number;
  requireDistinctPlaces: number;
}

export interface LeaderboardQuery {
  type: LeaderboardEntityType;
  window: LeaderboardWindow;
  scopeKey?: string;
  limit?: number;
}

export interface LeaderboardFamily {
  type: LeaderboardEntityType;
  windows: LeaderboardWindow[];
  title: string;
  trustAware: boolean;
}

export interface LeaderboardAdminTuning {
  [K: string]: LeaderboardFormula;
}
