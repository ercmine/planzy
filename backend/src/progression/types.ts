export type ProgressionTrack = "explorer" | "creator";

export type ProgressionActionType =
  | "explorer_place_saved_first"
  | "explorer_place_open_meaningful"
  | "explorer_review_submitted"
  | "explorer_new_category"
  | "explorer_new_city"
  | "explorer_daily_active"
  | "creator_draft_created"
  | "creator_metadata_completed"
  | "creator_video_published"
  | "creator_review_published"
  | "creator_quality_engagement"
  | "creator_new_coverage"
  | "creator_daily_publish";

export type ProgressionEntityType = "place" | "video" | "review" | "creator" | "category" | "city" | "session";

export type ProgressionEventStatus = "awarded" | "suppressed";

export type SuppressionReason =
  | "duplicate_dedupe_key"
  | "daily_cap_reached"
  | "cooldown_active"
  | "entity_already_rewarded"
  | "moderation_blocked"
  | "suspicious_activity"
  | "trust_gate";

export interface ProgressionActionInput {
  userId: string;
  type: ProgressionActionType;
  occurredAt?: Date;
  canonicalPlaceId?: string;
  targetEntityType?: ProgressionEntityType;
  targetEntityId?: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  moderationState?: "active" | "pending_review" | "hidden" | "removed" | "rejected";
  actorTrustTier?: "low" | "developing" | "trusted" | "high";
  suspicious?: boolean;
}

export interface XpLedgerEvent {
  eventId: string;
  dedupeKey: string;
  userId: string;
  type: ProgressionActionType;
  status: ProgressionEventStatus;
  tracks: ProgressionTrack[];
  xpAwarded: number;
  occurredAt: string;
  canonicalPlaceId?: string;
  targetEntityType?: ProgressionEntityType;
  targetEntityId?: string;
  metadata?: Record<string, unknown>;
  suppressionReason?: SuppressionReason;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPct: number;
}

export interface StreakState {
  key: "explorer_daily" | "creator_publish" | "review_daily";
  count: number;
  bestCount: number;
  lastDate?: string;
  graceUsed: boolean;
}

export interface MilestoneDefinition {
  id: string;
  track: ProgressionTrack | "both";
  metric: "saved_places" | "reviews_submitted" | "published_videos" | "explorer_streak" | "creator_streak";
  threshold: number;
  title: string;
}

export interface MilestoneProgress {
  milestoneId: string;
  completedAt?: string;
  progress: number;
}

export interface ProgressionProfile {
  userId: string;
  explorerXp: number;
  creatorXp: number;
  lifetimeXp: number;
  explorerLevel: LevelProgress;
  creatorLevel: LevelProgress;
  streaks: StreakState[];
  milestones: MilestoneProgress[];
  stats: Record<string, number>;
  antiAbuseFlags: SuppressionReason[];
  lastProgressionUpdateAt?: string;
}

export interface ProgressionConfig {
  xpByAction: Record<ProgressionActionType, number>;
  explorerLevelThresholds: number[];
  creatorLevelThresholds: number[];
  actionDailyCaps: Partial<Record<ProgressionActionType, number>>;
  actionCooldownMs: Partial<Record<ProgressionActionType, number>>;
  milestones: MilestoneDefinition[];
  trustMultipliers: Record<"low" | "developing" | "trusted" | "high", number>;
}

export interface ProgressionEventResult {
  event: XpLedgerEvent;
  profile: ProgressionProfile;
  levelUps: ProgressionTrack[];
  milestoneUnlocks: MilestoneDefinition[];
}

export interface ProgressionAdminSnapshot {
  config: ProgressionConfig;
  eventCount: number;
  suppressionCounts: Partial<Record<SuppressionReason, number>>;
}
