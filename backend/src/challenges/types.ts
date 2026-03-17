export type ChallengeTrack = "explorer" | "creator" | "mixed";
export type ChallengeStatus = "draft" | "active" | "paused" | "expired";
export type ChallengeScopeType = "city" | "neighborhood" | "category" | "mixed" | "hotspot";
export type ChallengeEventType = "place_saved" | "review_created" | "video_published" | "place_opened";

export interface ChallengeReward {
  xp: number;
  badgeId?: string;
  profileShowcaseItem?: string;
}

export interface ChallengeScope {
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

export interface ChallengeDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  cityLabel?: string;
  neighborhoodLabel?: string;
  categoryLabels?: string[];
  hotspotLabel?: string;
  scopeType: ChallengeScopeType;
  track: ChallengeTrack;
  status: ChallengeStatus;
  criteria: ChallengeCriterion[];
  reward: ChallengeReward;
  startsAt?: string;
  endsAt?: string;
  visibility: "public" | "invite_only";
  curation: { owner: string; notes?: string; tags?: string[] };
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeEvent {
  eventId: string;
  userId: string;
  type: ChallengeEventType;
  occurredAt?: string;
  canonicalPlaceId: string;
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
}

export interface UserChallengeState {
  userId: string;
  byChallengeId: Record<string, {
    progressByCriterionId: Record<string, number>;
    canonicalPlaceIdsByCriterionId: Record<string, string[]>;
    completedAt?: string;
    eventCountByDayByCriterionId: Record<string, Record<string, number>>;
  }>;
}
