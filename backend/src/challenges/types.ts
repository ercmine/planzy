export type ChallengeTrack = "explorer" | "creator" | "mixed";
export type ChallengeStatus = "draft" | "scheduled" | "active" | "paused" | "expired" | "retired";
export type ChallengeScopeType = "city" | "neighborhood" | "category" | "mixed" | "hotspot" | "global";
export type ChallengeEventType = "place_saved" | "review_created" | "video_published" | "place_opened";
export type ChallengeCadence = "weekly" | "seasonal" | "event";

export interface ChallengeReward {
  xp: number;
  bonusXp?: number;
  badgeId?: string;
  profileShowcaseItem?: string;
  achievementProgress?: { id: string; amount: number }[];
}

export interface ChallengeScope {
  marketIds?: string[];
  cityIds?: string[];
  neighborhoodIds?: string[];
  categoryIds?: string[];
  hotspotIds?: string[];
  canonicalPlaceIds?: string[];
}

export interface ChallengeCriterion {
  id: string;
  eventType: ChallengeEventType;
  target: number;
  distinctPlacesOnly?: boolean;
  minTrustScore?: number;
  maxEventsPerDay?: number;
  allowedContentStates?: Array<"published" | "approved" | "hidden" | "rejected" | "pending">;
  scope?: ChallengeScope;
}

export interface ChallengeRotation {
  poolKey: string;
  priority?: number;
  maxAppearancesPerWindow?: number;
}

export interface ChallengeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  cadence: ChallengeCadence;
  track: ChallengeTrack;
  scopeType: ChallengeScopeType;
  scope: ChallengeScope;
  status: ChallengeStatus;
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
  criteria: ChallengeCriterion[];
  reward: ChallengeReward;
  liveOps: {
    owner: string;
    notes?: string;
    tags?: string[];
    segmentIds?: string[];
    previewOnly?: boolean;
  };
  rotation?: ChallengeRotation;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeEvent {
  eventId: string;
  userId: string;
  type: ChallengeEventType;
  occurredAt?: string;
  canonicalPlaceId: string;
  marketId?: string;
  cityId?: string;
  neighborhoodId?: string;
  categoryIds?: string[];
  hotspotIds?: string[];
  contentState?: "published" | "approved" | "hidden" | "rejected" | "pending";
  trustScore?: number;
  suspicious?: boolean;
}

export interface ChallengeProgress {
  challengeId: string;
  status: "available" | "in_progress" | "completed" | "expired";
  completedAt?: string;
  criteria: Array<{ criterionId: string; current: number; target: number; remaining: number }>;
  qualifyingActions: number;
  rewardState: "locked" | "ready" | "granted";
  window: { startsAt: string; endsAt: string; secondsRemaining: number };
}

export interface UserChallengeState {
  userId: string;
  byChallengeId: Record<string, {
    progressByCriterionId: Record<string, number>;
    canonicalPlaceIdsByCriterionId: Record<string, string[]>;
    completedAt?: string;
    rewardGrantedAt?: string;
    eventCountByDayByCriterionId: Record<string, Record<string, number>>;
  }>;
}

export interface QuestHubResponse {
  generatedAt: string;
  timezone: "UTC";
  weekly: Array<ChallengeDefinition & { progress: ChallengeProgress }>;
  seasonal: Array<ChallengeDefinition & { progress: ChallengeProgress }>;
  upcoming: Array<Pick<ChallengeDefinition, "id" | "name" | "description" | "cadence" | "startsAt" | "endsAt" | "eventTheme">>;
}
