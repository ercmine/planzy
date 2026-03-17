import { randomUUID } from "node:crypto";

import { DEFAULT_PROGRESSION_CONFIG } from "./config.js";
import type {
  LevelProgress,
  MilestoneDefinition,
  MilestoneProgress,
  ProgressionActionInput,
  ProgressionAdminSnapshot,
  ProgressionConfig,
  ProgressionEventResult,
  ProgressionProfile,
  ProgressionTrack,
  StreakState,
  SuppressionReason,
  XpLedgerEvent
} from "./types.js";

type ProfileInternal = Omit<ProgressionProfile, "milestones" | "streaks" | "explorerLevel" | "creatorLevel"> & {
  streaks: Map<StreakState["key"], StreakState>;
  milestones: Map<string, MilestoneProgress>;
};

const TRACK_BY_ACTION: Record<string, ProgressionTrack[]> = {
  explorer_place_saved_first: ["explorer"],
  explorer_place_open_meaningful: ["explorer"],
  explorer_review_submitted: ["explorer"],
  explorer_new_category: ["explorer"],
  explorer_new_city: ["explorer"],
  explorer_daily_active: ["explorer"],
  creator_draft_created: ["creator"],
  creator_metadata_completed: ["creator"],
  creator_video_published: ["creator"],
  creator_review_published: ["creator"],
  creator_quality_engagement: ["creator"],
  creator_new_coverage: ["creator"],
  creator_daily_publish: ["creator"]
};

const FIRST_ACTION_ENTITY_REQUIRED = new Set([
  "explorer_place_saved_first",
  "explorer_place_open_meaningful",
  "explorer_new_category",
  "explorer_new_city",
  "creator_new_coverage"
]);

export class ProgressionService {
  private readonly config: ProgressionConfig;
  private readonly profiles = new Map<string, ProfileInternal>();
  private readonly ledgerByUser = new Map<string, XpLedgerEvent[]>();
  private readonly dedupe = new Set<string>();
  private readonly perActionDailyXp = new Map<string, number>();
  private readonly lastEventByKey = new Map<string, number>();
  private readonly rewardedEntityKeys = new Set<string>();
  private readonly suppressionCounts = new Map<SuppressionReason, number>();

  constructor(config: Partial<ProgressionConfig> = {}) {
    this.config = {
      ...DEFAULT_PROGRESSION_CONFIG,
      ...config,
      xpByAction: { ...DEFAULT_PROGRESSION_CONFIG.xpByAction, ...(config.xpByAction ?? {}) },
      actionDailyCaps: { ...DEFAULT_PROGRESSION_CONFIG.actionDailyCaps, ...(config.actionDailyCaps ?? {}) },
      actionCooldownMs: { ...DEFAULT_PROGRESSION_CONFIG.actionCooldownMs, ...(config.actionCooldownMs ?? {}) },
      trustMultipliers: { ...DEFAULT_PROGRESSION_CONFIG.trustMultipliers, ...(config.trustMultipliers ?? {}) },
      milestones: config.milestones ?? DEFAULT_PROGRESSION_CONFIG.milestones,
      explorerLevelThresholds: config.explorerLevelThresholds ?? DEFAULT_PROGRESSION_CONFIG.explorerLevelThresholds,
      creatorLevelThresholds: config.creatorLevelThresholds ?? DEFAULT_PROGRESSION_CONFIG.creatorLevelThresholds
    };
  }

  recordAction(input: ProgressionActionInput): ProgressionEventResult {
    const occurredAt = input.occurredAt ?? new Date();
    const profile = this.getOrCreateProfile(input.userId);
    const tracks = TRACK_BY_ACTION[input.type] ?? ["explorer"];
    const dedupeKey = input.dedupeKey ?? `${input.userId}:${input.type}:${input.targetEntityType ?? "none"}:${input.targetEntityId ?? "none"}:${input.canonicalPlaceId ?? "none"}:${this.dayKey(occurredAt)}`;

    let suppressionReason: SuppressionReason | undefined;

    if (this.dedupe.has(dedupeKey)) suppressionReason = "duplicate_dedupe_key";
    if (!suppressionReason && input.suspicious) suppressionReason = "suspicious_activity";
    if (!suppressionReason && ["hidden", "removed", "rejected"].includes(input.moderationState ?? "active")) suppressionReason = "moderation_blocked";

    const entityKey = `${input.userId}:${input.type}:${input.targetEntityType ?? "none"}:${input.targetEntityId ?? "none"}:${input.canonicalPlaceId ?? "none"}`;
    if (!suppressionReason && FIRST_ACTION_ENTITY_REQUIRED.has(input.type) && this.rewardedEntityKeys.has(entityKey)) {
      suppressionReason = "entity_already_rewarded";
    }

    const cooldownKey = `${input.userId}:${input.type}:${input.targetEntityId ?? input.canonicalPlaceId ?? "none"}`;
    const cooldownMs = this.config.actionCooldownMs[input.type] ?? 0;
    const last = this.lastEventByKey.get(cooldownKey);
    if (!suppressionReason && last && cooldownMs > 0 && occurredAt.getTime() - last < cooldownMs) {
      suppressionReason = "cooldown_active";
    }

    const baseXp = this.config.xpByAction[input.type] ?? 0;
    const trustMultiplier = input.type === "creator_quality_engagement" ? this.config.trustMultipliers[input.actorTrustTier ?? "developing"] : 1;
    if (!suppressionReason && input.type === "creator_quality_engagement" && trustMultiplier <= 0.25) {
      suppressionReason = "trust_gate";
    }

    const adjustedXp = Math.floor(baseXp * trustMultiplier);
    const dailyCap = this.config.actionDailyCaps[input.type];
    const dailyKey = `${input.userId}:${input.type}:${this.dayKey(occurredAt)}`;
    const xpAlreadyToday = this.perActionDailyXp.get(dailyKey) ?? 0;

    if (!suppressionReason && typeof dailyCap === "number" && xpAlreadyToday + adjustedXp > dailyCap) {
      suppressionReason = "daily_cap_reached";
    }

    const event: XpLedgerEvent = {
      eventId: randomUUID(),
      dedupeKey,
      userId: input.userId,
      type: input.type,
      status: suppressionReason ? "suppressed" : "awarded",
      tracks,
      xpAwarded: suppressionReason ? 0 : adjustedXp,
      occurredAt: occurredAt.toISOString(),
      canonicalPlaceId: input.canonicalPlaceId,
      targetEntityType: input.targetEntityType,
      targetEntityId: input.targetEntityId,
      metadata: input.metadata,
      suppressionReason
    };

    this.dedupe.add(dedupeKey);
    this.lastEventByKey.set(cooldownKey, occurredAt.getTime());
    if (FIRST_ACTION_ENTITY_REQUIRED.has(input.type)) this.rewardedEntityKeys.add(entityKey);
    if (!suppressionReason) this.perActionDailyXp.set(dailyKey, xpAlreadyToday + adjustedXp);
    this.appendLedger(event);

    const previousExplorerLevel = this.toLevelProgress(profile.explorerXp, this.config.explorerLevelThresholds).level;
    const previousCreatorLevel = this.toLevelProgress(profile.creatorXp, this.config.creatorLevelThresholds).level;

    if (!suppressionReason) {
      if (tracks.includes("explorer")) profile.explorerXp += adjustedXp;
      if (tracks.includes("creator")) profile.creatorXp += adjustedXp;
      profile.lifetimeXp += adjustedXp;
      profile.lastProgressionUpdateAt = occurredAt.toISOString();
      profile.stats[input.type] = (profile.stats[input.type] ?? 0) + 1;
      this.updateStreaks(profile, input.type, occurredAt);
    } else {
      profile.antiAbuseFlags = Array.from(new Set([...profile.antiAbuseFlags, suppressionReason]));
      this.suppressionCounts.set(suppressionReason, (this.suppressionCounts.get(suppressionReason) ?? 0) + 1);
    }

    const milestoneUnlocks = this.updateMilestones(profile, occurredAt);
    const snapshot = this.snapshotProfile(profile);
    const levelUps: ProgressionTrack[] = [];
    if (snapshot.explorerLevel.level > previousExplorerLevel) levelUps.push("explorer");
    if (snapshot.creatorLevel.level > previousCreatorLevel) levelUps.push("creator");

    return { event, profile: snapshot, levelUps, milestoneUnlocks };
  }

  getProgressionProfile(userId: string): ProgressionProfile {
    return this.snapshotProfile(this.getOrCreateProfile(userId));
  }

  getRecentXpHistory(userId: string, limit = 20): XpLedgerEvent[] {
    return (this.ledgerByUser.get(userId) ?? []).slice(-limit).reverse();
  }

  getAdminSnapshot(): ProgressionAdminSnapshot {
    const suppressionCounts: Partial<Record<SuppressionReason, number>> = {};
    for (const [reason, count] of this.suppressionCounts) suppressionCounts[reason] = count;
    return {
      config: this.config,
      eventCount: Array.from(this.ledgerByUser.values()).reduce((acc, items) => acc + items.length, 0),
      suppressionCounts
    };
  }

  private updateStreaks(profile: ProfileInternal, action: string, occurredAt: Date): void {
    if (action.startsWith("explorer_")) this.bumpStreak(profile, "explorer_daily", occurredAt);
    if (action === "explorer_review_submitted") this.bumpStreak(profile, "review_daily", occurredAt);
    if (action === "creator_video_published" || action === "creator_daily_publish") this.bumpStreak(profile, "creator_publish", occurredAt);
  }

  private bumpStreak(profile: ProfileInternal, key: StreakState["key"], occurredAt: Date): void {
    const day = this.dayKey(occurredAt);
    const streak = profile.streaks.get(key) ?? { key, count: 0, bestCount: 0, graceUsed: false };
    if (!streak.lastDate) {
      streak.count = 1;
    } else {
      const diffDays = this.daysBetween(streak.lastDate, day);
      if (diffDays === 1) {
        streak.count += 1;
      } else if (diffDays > 1) {
        if (!streak.graceUsed && diffDays === 2) {
          streak.graceUsed = true;
        } else {
          streak.count = 1;
          streak.graceUsed = false;
        }
      }
    }
    streak.lastDate = day;
    streak.bestCount = Math.max(streak.bestCount, streak.count);
    profile.streaks.set(key, streak);
  }

  private updateMilestones(profile: ProfileInternal, occurredAt: Date): MilestoneDefinition[] {
    const unlocks: MilestoneDefinition[] = [];
    for (const milestone of this.config.milestones) {
      const current = profile.milestones.get(milestone.id) ?? { milestoneId: milestone.id, progress: 0 };
      current.progress = this.metricValue(profile, milestone.metric);
      if (!current.completedAt && current.progress >= milestone.threshold) {
        current.completedAt = occurredAt.toISOString();
        unlocks.push(milestone);
      }
      profile.milestones.set(milestone.id, current);
    }
    return unlocks;
  }

  private metricValue(profile: ProfileInternal, metric: MilestoneDefinition["metric"]): number {
    switch (metric) {
      case "saved_places":
        return profile.stats.explorer_place_saved_first ?? 0;
      case "reviews_submitted":
        return profile.stats.explorer_review_submitted ?? 0;
      case "published_videos":
        return profile.stats.creator_video_published ?? 0;
      case "explorer_streak":
        return profile.streaks.get("explorer_daily")?.count ?? 0;
      case "creator_streak":
        return profile.streaks.get("creator_publish")?.count ?? 0;
    }
  }

  private getOrCreateProfile(userId: string): ProfileInternal {
    const existing = this.profiles.get(userId);
    if (existing) return existing;
    const created: ProfileInternal = {
      userId,
      explorerXp: 0,
      creatorXp: 0,
      lifetimeXp: 0,
      stats: {},
      antiAbuseFlags: [],
      streaks: new Map(),
      milestones: new Map(),
      lastProgressionUpdateAt: undefined
    };
    this.profiles.set(userId, created);
    return created;
  }

  private snapshotProfile(profile: ProfileInternal): ProgressionProfile {
    return {
      userId: profile.userId,
      explorerXp: profile.explorerXp,
      creatorXp: profile.creatorXp,
      lifetimeXp: profile.lifetimeXp,
      stats: { ...profile.stats },
      antiAbuseFlags: [...profile.antiAbuseFlags],
      lastProgressionUpdateAt: profile.lastProgressionUpdateAt,
      explorerLevel: this.toLevelProgress(profile.explorerXp, this.config.explorerLevelThresholds),
      creatorLevel: this.toLevelProgress(profile.creatorXp, this.config.creatorLevelThresholds),
      streaks: Array.from(profile.streaks.values()),
      milestones: Array.from(profile.milestones.values())
    };
  }

  private toLevelProgress(xp: number, thresholds: number[]): LevelProgress {
    let level = 1;
    for (let i = 0; i < thresholds.length; i += 1) {
      if (xp >= thresholds[i]!) level = i + 1;
    }
    const currentLevelXp = thresholds[level - 1] ?? 0;
    const nextLevelXp = thresholds[level] ?? currentLevelXp;
    const denominator = Math.max(nextLevelXp - currentLevelXp, 1);
    const progressPct = nextLevelXp === currentLevelXp ? 1 : Math.min(1, (xp - currentLevelXp) / denominator);
    return { level, currentXp: xp, currentLevelXp, nextLevelXp, progressPct };
  }

  private appendLedger(event: XpLedgerEvent): void {
    const events = this.ledgerByUser.get(event.userId) ?? [];
    events.push(event);
    this.ledgerByUser.set(event.userId, events);
  }

  private dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private daysBetween(startDayIso: string, endDayIso: string): number {
    const start = Date.parse(`${startDayIso}T00:00:00.000Z`);
    const end = Date.parse(`${endDayIso}T00:00:00.000Z`);
    return Math.floor((end - start) / (24 * 60 * 60 * 1000));
  }
}
