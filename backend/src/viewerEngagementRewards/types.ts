export type ViewerRewardAction =
  | "watch"
  | "completion"
  | "rating"
  | "comment"
  | "comment_reply"
  | "save"
  | "share"
  | "place_click"
  | "follow_creator"
  | "session_completion"
  | "playlist_chain"
  | "streak"
  | "sponsored_watch"
  | "boosted_engagement";

export type RewardFundingSource = "platform" | "campaign";
export type RewardStatus = "pending" | "settled" | "rejected" | "reversed";

export interface WatchSession {
  id: string;
  userId: string;
  videoId: string;
  creatorId: string;
  placeId?: string;
  startedAt: string;
  endedAt?: string;
  totalWatchMs: number;
  maxProgressMs: number;
  durationMs: number;
  heartbeatCount: number;
  foregroundHeartbeats: number;
  milestonesPaid: number[];
  status: "active" | "paused" | "completed" | "abandoned";
  deviceId?: string;
  ipHash?: string;
}

export interface ViewerEngagementEvent {
  id: string;
  userId: string;
  videoId: string;
  creatorId: string;
  placeId?: string;
  action: ViewerRewardAction;
  value?: number;
  text?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface ViewerRewardRule {
  action: ViewerRewardAction;
  enabled: boolean;
  baseRewardAtomic: bigint;
  minWatchMs?: number;
  minWatchPct?: number;
  cooldownHours: number;
  maxPerDay: number;
  requiresUniqueComment?: boolean;
  requiresMinCommentLength?: number;
  requiresWatchFirst?: boolean;
  pendingIfRiskAtOrAbove?: number;
}

export interface ViewerRewardLedgerEntry {
  id: string;
  userId: string;
  videoId: string;
  creatorId: string;
  placeId?: string;
  action: ViewerRewardAction;
  amountAtomic: bigint;
  source: RewardFundingSource;
  sourceId: string;
  status: RewardStatus;
  reason: string;
  decisionId: string;
  campaignId?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ViewerRewardEligibilityDecision {
  id: string;
  userId: string;
  videoId: string;
  action: ViewerRewardAction;
  eligible: boolean;
  reasonCodes: string[];
  riskScore: number;
  pendingReview: boolean;
  ruleSnapshot?: ViewerRewardRule;
  createdAt: string;
}

export interface ViewerEngagementRiskFlag {
  id: string;
  userId: string;
  videoId?: string;
  sessionId?: string;
  severity: "low" | "medium" | "high";
  reason: string;
  score: number;
  createdAt: string;
}

export interface SponsoredVideoRewardPool {
  id: string;
  campaignId: string;
  sponsorBusinessId: string;
  fundedAtomic: bigint;
  remainingAtomic: bigint;
  startsAt: string;
  endsAt: string;
  active: boolean;
  eligibleActions: ViewerRewardAction[];
  perUserDailyCapAtomic: bigint;
}

export interface UserViewerRewardSummary {
  userId: string;
  earnedAtomic: bigint;
  pendingAtomic: bigint;
  rejectedAtomic: bigint;
  todayEarnedAtomic: bigint;
  streakDays: number;
  lastEngagementDate?: string;
  updatedAt: string;
}

export interface ViewerRewardConfig {
  minHeartbeatMs: number;
  minForegroundRatio: number;
  minimumMeaningfulWatchMs: number;
  minimumMeaningfulWatchPct: number;
  maxRewardsPerDayAtomic: bigint;
  maxRewardsPerVideoPerDayAtomic: bigint;
  duplicateCommentWindowHours: number;
  selfEngagementForbidden: boolean;
  trustTierRiskThresholds: { pending: number; reject: number };
}

export interface ViewerEngagementStore {
  createWatchSession(session: WatchSession): void;
  updateWatchSession(session: WatchSession): void;
  getWatchSession(sessionId: string): WatchSession | null;
  listUserWatchSessions(userId: string, limit?: number): WatchSession[];

  saveEvent(event: ViewerEngagementEvent): void;
  listUserEvents(userId: string, action?: ViewerRewardAction): ViewerEngagementEvent[];

  upsertRewardRule(rule: ViewerRewardRule): void;
  listRewardRules(): ViewerRewardRule[];
  getRewardRule(action: ViewerRewardAction): ViewerRewardRule | null;

  saveEligibilityDecision(decision: ViewerRewardEligibilityDecision): void;
  listEligibilityDecisions(userId: string, videoId?: string): ViewerRewardEligibilityDecision[];

  saveLedgerEntry(entry: ViewerRewardLedgerEntry): void;
  listLedgerEntries(userId?: string): ViewerRewardLedgerEntry[];
  getLedgerEntry(entryId: string): ViewerRewardLedgerEntry | null;

  saveRiskFlag(flag: ViewerEngagementRiskFlag): void;
  listRiskFlags(userId?: string): ViewerEngagementRiskFlag[];

  saveRewardSummary(summary: UserViewerRewardSummary): void;
  getRewardSummary(userId: string): UserViewerRewardSummary | null;

  saveSponsoredPool(pool: SponsoredVideoRewardPool): void;
  getSponsoredPool(poolId: string): SponsoredVideoRewardPool | null;
  findSponsoredPoolForVideo(videoId: string, atIso: string): SponsoredVideoRewardPool | null;
  setVideoCampaign(videoId: string, poolId: string): void;
  listSponsoredPools(): SponsoredVideoRewardPool[];
}
