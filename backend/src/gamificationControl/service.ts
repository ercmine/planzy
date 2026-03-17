import type { AnalyticsService } from "../analytics/service.js";
import type { GamificationControlStore } from "./store.js";
import type {
  ActionType,
  AdminAuditLog,
  GamificationEvent,
  ProgressionSummaryDto,
  RewardDecision,
  RuleVersion,
  UserGamificationState
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function defaultState(userId: string): UserGamificationState {
  return {
    userId,
    totalXp: 0,
    xpByTrack: { explorer: 0, creator: 0 },
    actionCounts: {},
    distinctPlacesByAction: {},
    badgeIds: [],
    questProgress: {},
    completedQuestIds: [],
    streaks: {},
    collectionProgress: {},
    leaderboardScore: 0,
    trustedActions: 0,
    reviewCount: 0,
    videoCount: 0,
    recentDecisionIds: []
  };
}

export class GamificationControlService {
  constructor(
    private readonly store: GamificationControlStore,
    private readonly analyticsService?: AnalyticsService
  ) {}

  seedInitialRules(adminId: string): RuleVersion {
    const existing = this.store.listRuleVersions();
    if (existing.length > 0) return existing[0]!;
    const rule: RuleVersion = {
      id: id("rule"),
      version: 1,
      lifecycle: "active",
      environment: "dev",
      createdBy: adminId,
      createdAt: nowIso(),
      publishedAt: nowIso(),
      scopes: [{}],
      mechanics: {
        xp: {
          maxDailyXp: 300,
          trustMultipliers: [{ minTrustScore: 80, multiplier: 1.2 }, { minTrustScore: 50, multiplier: 1 }],
          rules: [
            { id: "xp_save", actionType: "place_saved", xp: 5, track: "explorer", requiresDistinctPlace: true },
            { id: "xp_review", actionType: "place_reviewed", xp: 20, track: "explorer", cooldownSeconds: 120 },
            { id: "xp_video", actionType: "creator_video_published", xp: 30, track: "creator", cooldownSeconds: 300 },
            { id: "xp_challenge", actionType: "challenge_completed", xp: 40, track: "explorer" },
            { id: "xp_collection", actionType: "collection_progressed", xp: 15, track: "explorer" }
          ]
        },
        badges: [
          { id: "badge_xp_100", name: "Rising Explorer", metric: "xp_total", threshold: 100, grantsXp: 10 },
          { id: "badge_reviews_5", name: "Trusted Reviewer", metric: "reviews", threshold: 5, trustGate: 50 }
        ],
        quests: [{
          id: "quest_weekly_reviews",
          name: "Weekly Reviews",
          actionType: "place_reviewed",
          targetCount: 3,
          rewardXp: 35,
          startAt: "2025-01-01T00:00:00.000Z",
          endAt: "2030-01-01T00:00:00.000Z",
          distinctPlacesRequired: 2
        }],
        streaks: [{ id: "streak_creator", name: "Creator cadence", actionType: "creator_video_published", windowDays: 1, graceDays: 1, milestones: [3, 7] }],
        collections: [{ id: "collection_city_core", name: "City Core", requiredPlaceCount: 3, rewardXp: 45 }],
        leaderboard: {
          windowDays: 7,
          tieBreaker: "trust_score",
          weights: [
            { actionType: "place_reviewed", weight: 10, qualityWeight: 3 },
            { actionType: "creator_video_published", weight: 8, qualityWeight: 4 },
            { actionType: "challenge_completed", weight: 6, qualityWeight: 2 }
          ]
        },
        antiAbuse: {
          cooldownSecondsByAction: { place_reviewed: 90, creator_video_published: 300 },
          dailyCapsByAction: { place_saved: 50, place_reviewed: 20, creator_video_published: 10 },
          distinctPlacesRequiredByAction: { place_saved: 1, place_reviewed: 1 },
          suppressModeratedContent: true,
          suppressLowTrustBelow: 20
        }
      }
    };
    this.store.saveRuleVersion(rule);
    return rule;
  }

  createDraft(adminId: string, notes?: string): RuleVersion {
    const latest = this.store.listRuleVersions()[0] ?? this.seedInitialRules(adminId);
    const draft: RuleVersion = {
      ...latest,
      id: id("rule"),
      version: latest.version + 1,
      lifecycle: "draft",
      createdBy: adminId,
      createdAt: nowIso(),
      publishedAt: undefined,
      notes
    };
    this.store.saveRuleVersion(draft);
    this.logAdminAction(adminId, "create_draft", { ruleVersionId: draft.id, sourceRuleVersionId: latest.id });
    return draft;
  }

  updateDraft(ruleVersionId: string, adminId: string, updater: (draft: RuleVersion) => RuleVersion): RuleVersion {
    const rule = this.store.getRuleVersion(ruleVersionId);
    if (!rule || rule.lifecycle !== "draft") throw new Error("Draft rule version not found");
    const updated = updater(rule);
    this.validateRule(updated);
    this.store.saveRuleVersion(updated);
    this.logAdminAction(adminId, "create_draft", { ruleVersionId, updated: true });
    return updated;
  }

  publishRuleVersion(ruleVersionId: string, adminId: string, effectiveFrom = nowIso()): RuleVersion {
    const target = this.store.getRuleVersion(ruleVersionId);
    if (!target) throw new Error("Rule version not found");
    this.validateRule(target);
    for (const rule of this.store.listRuleVersions()) {
      if (rule.lifecycle === "active") this.store.saveRuleVersion({ ...rule, lifecycle: "archived" });
    }
    const active = { ...target, lifecycle: "active" as const, effectiveFrom, publishedAt: nowIso() };
    this.store.saveRuleVersion(active);
    this.logAdminAction(adminId, "publish_rules", { ruleVersionId, effectiveFrom });
    void this.analyticsService?.track({ type: "gamification_rule_published", ruleVersionId } as never, {} as never);
    return active;
  }

  processEvent(event: GamificationEvent): RewardDecision {
    const activeRule = this.store.getActiveRuleVersion(nowIso());
    if (!activeRule) throw new Error("No active gamification rule version");

    if (this.store.hasProcessedEvent(event.eventId)) {
      const existing = this.store.listDecisionsByUser(event.userId).find((decision) => decision.eventId === event.eventId);
      if (existing) return existing;
    }

    const state = this.store.getUserState(event.userId) ?? defaultState(event.userId);
    const reasons: string[] = [];
    let suppressed = false;
    if (activeRule.mechanics.antiAbuse.suppressModeratedContent && event.moderationState && event.moderationState !== "approved") {
      suppressed = true;
      reasons.push("moderation_suppressed");
    }
    if (event.trustScore < activeRule.mechanics.antiAbuse.suppressLowTrustBelow) {
      suppressed = true;
      reasons.push("low_trust_suppressed");
    }

    const currentCount = state.actionCounts[event.actionType] ?? 0;
    const cap = activeRule.mechanics.antiAbuse.dailyCapsByAction[event.actionType];
    if ((cap ?? Number.POSITIVE_INFINITY) <= currentCount) {
      suppressed = true;
      reasons.push("daily_cap_reached");
    }

    const lastDate = state.streaks[`last_${event.actionType}`]?.lastEventDate;
    const cooldown = activeRule.mechanics.antiAbuse.cooldownSecondsByAction[event.actionType];
    if (cooldown && lastDate) {
      const elapsedSeconds = (Date.parse(event.occurredAt) - Date.parse(lastDate)) / 1000;
      if (elapsedSeconds < cooldown) {
        suppressed = true;
        reasons.push("cooldown_active");
      }
    }

    this.store.markProcessedEvent(event.eventId);
    this.store.saveEvent(event);

    let awardedXp = 0;
    let leaderboardDelta = 0;
    const unlockedBadgeIds: string[] = [];
    const completedQuestIds: string[] = [];
    const streakMilestonesReached: Array<{ streakId: string; days: number }> = [];

    if (!suppressed) {
      const xpRule = activeRule.mechanics.xp.rules.find((rule) => rule.actionType === event.actionType);
      if (xpRule) {
        const multiplier = activeRule.mechanics.xp.trustMultipliers
          .sort((a, b) => b.minTrustScore - a.minTrustScore)
          .find((row) => event.trustScore >= row.minTrustScore)?.multiplier ?? 1;
        awardedXp = Math.floor(xpRule.xp * multiplier);
        if ((state.totalXp + awardedXp) > activeRule.mechanics.xp.maxDailyXp && dayKey(event.occurredAt) === dayKey(nowIso())) {
          awardedXp = Math.max(0, activeRule.mechanics.xp.maxDailyXp - state.totalXp);
          reasons.push("max_daily_xp_limited");
        }
        state.xpByTrack[xpRule.track] += awardedXp;
      }

      state.totalXp += awardedXp;
      state.actionCounts[event.actionType] = currentCount + 1;
      state.streaks[`last_${event.actionType}`] = { lastEventDate: event.occurredAt, currentDays: 0 };

      if (event.canonicalPlaceId) {
        const distinct = new Set(state.distinctPlacesByAction[event.actionType] ?? []);
        distinct.add(event.canonicalPlaceId);
        state.distinctPlacesByAction[event.actionType] = [...distinct];
      }

      if (event.actionType === "place_reviewed") state.reviewCount += 1;
      if (event.actionType === "creator_video_published") state.videoCount += 1;
      if (event.trustScore >= 70) state.trustedActions += 1;

      for (const badge of activeRule.mechanics.badges) {
        if (state.badgeIds.includes(badge.id)) continue;
        if ((badge.trustGate ?? 0) > event.trustScore) continue;
        const metric = badge.metric === "xp_total" ? state.totalXp
          : badge.metric === "reviews" ? state.reviewCount
            : badge.metric === "videos" ? state.videoCount
              : state.trustedActions;
        if (metric >= badge.threshold) {
          state.badgeIds.push(badge.id);
          if (badge.grantsXp) state.totalXp += badge.grantsXp;
          unlockedBadgeIds.push(badge.id);
        }
      }

      for (const quest of activeRule.mechanics.quests) {
        if (state.completedQuestIds.includes(quest.id)) continue;
        if (event.actionType !== quest.actionType) continue;
        if (event.occurredAt < quest.startAt || event.occurredAt > quest.endAt) continue;
        const progress = (state.questProgress[quest.id] ?? 0) + 1;
        state.questProgress[quest.id] = progress;
        if (progress >= quest.targetCount) {
          state.completedQuestIds.push(quest.id);
          state.totalXp += quest.rewardXp;
          completedQuestIds.push(quest.id);
        }
      }

      for (const streakRule of activeRule.mechanics.streaks) {
        if (event.actionType !== streakRule.actionType) continue;
        const streak = state.streaks[streakRule.id] ?? { currentDays: 0 };
        const previousDate = streak.lastEventDate;
        if (!previousDate) {
          streak.currentDays = 1;
        } else {
          const diffDays = Math.floor((Date.parse(event.occurredAt) - Date.parse(previousDate)) / (1000 * 60 * 60 * 24));
          streak.currentDays = diffDays <= streakRule.windowDays + streakRule.graceDays ? streak.currentDays + 1 : 1;
        }
        streak.lastEventDate = event.occurredAt;
        state.streaks[streakRule.id] = streak;
        for (const milestone of streakRule.milestones) {
          if (streak.currentDays === milestone) streakMilestonesReached.push({ streakId: streakRule.id, days: milestone });
        }
      }

      for (const collection of activeRule.mechanics.collections) {
        if (!event.canonicalPlaceId) continue;
        if (collection.cityId && collection.cityId !== event.cityId) continue;
        if (collection.categoryId && collection.categoryId !== event.categoryId) continue;
        const progress = new Set(state.collectionProgress[collection.id] ?? []);
        const beforeSize = progress.size;
        progress.add(event.canonicalPlaceId);
        state.collectionProgress[collection.id] = [...progress];
        if (beforeSize < collection.requiredPlaceCount && progress.size >= collection.requiredPlaceCount) {
          state.totalXp += collection.rewardXp;
          reasons.push(`collection_completed:${collection.id}`);
        }
      }

      const weight = activeRule.mechanics.leaderboard.weights.find((row) => row.actionType === event.actionType);
      if (weight) {
        leaderboardDelta = weight.weight + Math.round((event.qualityScore ?? 0) * weight.qualityWeight);
        state.leaderboardScore += leaderboardDelta;
      }
    }

    const decision: RewardDecision = {
      decisionId: id("decision"),
      userId: event.userId,
      eventId: event.eventId,
      ruleVersionId: activeRule.id,
      awardedXp,
      suppressed,
      reasons,
      unlockedBadgeIds,
      completedQuestIds,
      streakMilestonesReached,
      leaderboardDelta,
      createdAt: nowIso()
    };

    this.store.saveDecision(decision);
    state.recentDecisionIds = [...state.recentDecisionIds, decision.decisionId].slice(-20);
    this.store.saveUserState(state);
    void this.analyticsService?.track({ type: "gamification_decision", suppressed, reasons } as never, {} as never);
    return decision;
  }

  recomputeUser(userId: string, adminId: string): void {
    this.store.clearUserState(userId);
    const events = this.store.listEventsByUser(userId);
    for (const event of events) {
      this.processEvent({ ...event, eventId: `${event.eventId}_recompute`, source: "admin_recompute" });
    }
    this.logAdminAction(adminId, "recompute_user", { userId, events: events.length });
  }

  explainDecision(decisionId: string): RewardDecision | undefined {
    return this.store.getDecision(decisionId);
  }

  getProgressionSummary(userId: string): ProgressionSummaryDto {
    const state = this.store.getUserState(userId) ?? defaultState(userId);
    const level = Math.floor(state.totalXp / 100) + 1;
    const recentDecisions = state.recentDecisionIds
      .map((decisionId) => this.store.getDecision(decisionId))
      .filter(Boolean)
      .reverse() as RewardDecision[];

    const activeRule = this.store.getActiveRuleVersion(nowIso());
    const questProgress: Record<string, { current: number; completed: boolean }> = {};
    for (const quest of activeRule?.mechanics.quests ?? []) {
      questProgress[quest.id] = {
        current: state.questProgress[quest.id] ?? 0,
        completed: state.completedQuestIds.includes(quest.id)
      };
    }

    return {
      userId,
      totalXp: state.totalXp,
      level,
      badges: state.badgeIds,
      streaks: Object.fromEntries(Object.entries(state.streaks).filter(([key]) => !key.startsWith("last_")).map(([key, value]) => [key, value.currentDays])),
      questProgress,
      leaderboardScore: state.leaderboardScore,
      recentDecisions
    };
  }

  getAdminSnapshot() {
    const rules = this.store.listRuleVersions();
    const active = rules.find((rule) => rule.lifecycle === "active") ?? null;
    const suppressions = rules.length;
    return { activeRuleVersion: active, ruleVersions: rules, adminAudit: this.store.listAdminAuditLogs(), suppressionsObserved: suppressions };
  }

  private logAdminAction(actorId: string, action: AdminAuditLog["action"], metadata: Record<string, unknown>): void {
    this.store.saveAdminAuditLog({ id: id("audit"), actorId, action, metadata, createdAt: nowIso() });
  }

  private validateRule(rule: RuleVersion): void {
    if (rule.mechanics.xp.maxDailyXp < 0) throw new Error("maxDailyXp must be >= 0");
    if (rule.mechanics.xp.rules.length === 0) throw new Error("At least one XP rule is required");
  }
}
