import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import { DEFAULT_LEADERBOARD_FORMULAS } from "./config.js";
import type { LeaderboardsStore } from "./store.js";
import type {
  LeaderboardAdminTuning,
  LeaderboardContributionEvent,
  LeaderboardEntityType,
  LeaderboardFamily,
  LeaderboardFormula,
  LeaderboardQuery,
  LeaderboardScoreSnapshot,
  LeaderboardWindow,
  ScoreComponents
} from "./types.js";

type Aggregate = { entityId: string; scopeKey?: string; components: ScoreComponents; places: Set<string>; activeDays: Set<string>; suppressed: Set<string> };

const WINDOWS: LeaderboardWindow[] = ["daily", "weekly", "monthly", "all_time"];
const TRUST_MULTIPLIER: Record<string, number> = { low: 0.3, developing: 0.7, trusted: 1, high: 1.15 };

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function windowStart(window: LeaderboardWindow, now: Date): Date {
  const d = new Date(now.toISOString());
  if (window === "all_time") return new Date("1970-01-01T00:00:00.000Z");
  if (window === "daily") return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
  if (window === "weekly") {
    const weekday = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() - ((weekday + 6) % 7));
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export class LeaderboardsService {
  constructor(
    private readonly store: LeaderboardsStore,
    private readonly analytics?: AnalyticsService,
    private readonly notifications?: NotificationService,
    private readonly nowProvider: () => Date = () => new Date()
  ) {
    (Object.keys(DEFAULT_LEADERBOARD_FORMULAS) as LeaderboardEntityType[]).forEach((type) => {
      if (!this.store.getFormula(type)) this.store.saveFormula(type, DEFAULT_LEADERBOARD_FORMULAS[type]);
    });
  }

  listFamilies(): LeaderboardFamily[] {
    return [
      { type: "creator", windows: WINDOWS, title: "Top Creators", trustAware: true },
      { type: "explorer", windows: WINDOWS, title: "Top Explorers", trustAware: true },
      { type: "city", windows: WINDOWS, title: "Top Cities", trustAware: true },
      { type: "category", windows: WINDOWS, title: "Top Categories", trustAware: true }
    ];
  }

  async recordEvent(event: LeaderboardContributionEvent): Promise<{ ignored: boolean }> {
    if (this.store.hasEvent(event.eventId)) return { ignored: true };
    this.store.appendEvent(event);
    await this.analytics?.track({ type: "leaderboard_event_recorded", actionType: event.actionType, suspicious: Boolean(event.suspicious) } as never, {} as never);
    return { ignored: false };
  }

  rebuildSnapshots(): void {
    const now = this.nowProvider();
    for (const type of ["creator", "explorer", "city", "category"] as LeaderboardEntityType[]) {
      for (const window of WINDOWS) {
        this.rebuildTypeWindow(type, window, undefined, now);
      }
    }
  }

  getLeaderboard(query: LeaderboardQuery): LeaderboardScoreSnapshot[] {
    const list = this.store.getSnapshots(query.type, query.window, query.scopeKey);
    return list.slice(0, Math.max(1, Math.min(200, query.limit ?? 50)));
  }

  getMyRank(input: { type: LeaderboardEntityType; window: LeaderboardWindow; userId: string }): { rank?: number; score?: number } {
    const rows = this.store.getSnapshots(input.type, input.window);
    const hit = rows.find((row) => row.entityId === input.userId);
    return hit ? { rank: hit.rank, score: hit.score } : {};
  }

  inspectEntity(input: { type: LeaderboardEntityType; window: LeaderboardWindow; entityId: string }): LeaderboardScoreSnapshot | undefined {
    return this.store.getSnapshots(input.type, input.window).find((row) => row.entityId === input.entityId);
  }

  tuneFormula(type: LeaderboardEntityType, patch: Partial<LeaderboardFormula>): LeaderboardFormula {
    const existing = this.store.getFormula(type) ?? DEFAULT_LEADERBOARD_FORMULAS[type];
    const next: LeaderboardFormula = {
      ...existing,
      ...patch,
      weights: { ...existing.weights, ...(patch.weights ?? {}) }
    };
    this.store.saveFormula(type, next);
    return next;
  }

  listFormulas(): LeaderboardAdminTuning {
    return {
      creator: this.store.getFormula("creator") ?? DEFAULT_LEADERBOARD_FORMULAS.creator,
      explorer: this.store.getFormula("explorer") ?? DEFAULT_LEADERBOARD_FORMULAS.explorer,
      city: this.store.getFormula("city") ?? DEFAULT_LEADERBOARD_FORMULAS.city,
      category: this.store.getFormula("category") ?? DEFAULT_LEADERBOARD_FORMULAS.category
    };
  }

  private rebuildTypeWindow(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey: string | undefined, now: Date): void {
    const formula = this.store.getFormula(type) ?? DEFAULT_LEADERBOARD_FORMULAS[type];
    const start = windowStart(window, now).getTime();
    const events = this.store.listEvents().filter((event) => new Date(event.occurredAt).getTime() >= start);
    const counts = new Map<string, number>();
    const aggregates = new Map<string, Aggregate>();

    for (const event of events) {
      const entityId = this.toEntityId(type, event);
      if (!entityId) continue;
      const key = `${entityId}`;
      const placeDaily = `${event.actorUserId}:${event.canonicalPlaceId ?? "none"}:${dayKey(event.occurredAt)}`;
      counts.set(placeDaily, (counts.get(placeDaily) ?? 0) + 1);
      const overCap = (counts.get(placeDaily) ?? 0) > formula.maxActionsPerPlacePerDay;
      const quality = clamp01(event.qualityScore ?? 0.6);
      const agg = aggregates.get(key) ?? {
        entityId,
        scopeKey,
        places: new Set<string>(),
        activeDays: new Set<string>(),
        suppressed: new Set<string>(),
        components: { meaningfulActions: 0, trustedActions: 0, qualityPoints: 0, engagementPoints: 0, diversityBonus: 0, consistencyBonus: 0, antiSpamPenalty: 0, moderationPenalty: 0, trustMultiplier: 0.7 }
      };
      const moderationBlocked = ["hidden", "removed", "rejected"].includes(event.moderationState ?? "active");
      const trustMultiplier = TRUST_MULTIPLIER[event.targetTrustTier ?? event.actorTrustTier ?? "developing"] ?? 0.7;
      if (moderationBlocked) {
        agg.components.moderationPenalty += formula.weights.moderationPenalty;
        agg.suppressed.add("moderation_blocked");
      }
      if (overCap || event.suspicious) {
        agg.components.antiSpamPenalty += formula.weights.antiSpamPenalty;
        agg.suppressed.add(overCap ? "place_repeat_cap" : "suspicious_pattern");
      }
      if (!moderationBlocked && !overCap && quality >= formula.minimumQualityThreshold) {
        agg.components.meaningfulActions += 1;
        agg.components.qualityPoints += quality;
        agg.components.engagementPoints += clamp01(event.engagementScore ?? 0.4);
        if (trustMultiplier >= 1) agg.components.trustedActions += 1;
        agg.places.add(event.canonicalPlaceId ?? `${event.normalizedCityId ?? "city"}:${event.normalizedCategoryId ?? "cat"}`);
        agg.activeDays.add(dayKey(event.occurredAt));
        agg.components.trustMultiplier = Math.max(agg.components.trustMultiplier, trustMultiplier);
      }
      aggregates.set(key, agg);
    }

    const previous = this.store.getSnapshots(type, window, scopeKey);
    const rows = [...aggregates.values()]
      .map((agg) => {
        agg.components.diversityBonus = Math.max(0, agg.places.size - 1);
        agg.components.consistencyBonus = Math.max(0, agg.activeDays.size - 1);
        if (agg.places.size < formula.requireDistinctPlaces && type !== "city" && type !== "category") {
          agg.suppressed.add("distinct_place_gate");
        }
        const c = agg.components;
        const base = c.meaningfulActions * formula.weights.meaningfulAction
          + c.qualityPoints * formula.weights.quality
          + c.engagementPoints * formula.weights.engagement
          + c.diversityBonus * formula.weights.diversity
          + c.consistencyBonus * formula.weights.consistency;
        const score = Math.max(0, (base * (c.trustMultiplier * formula.weights.trust)) - c.antiSpamPenalty - c.moderationPenalty);
        return {
          leaderboardType: type,
          window,
          entityId: agg.entityId,
          scopeKey,
          score: Number(score.toFixed(3)),
          rank: 0,
          movementDelta: 0,
          scoreComponents: c,
          suppressionFlags: [...agg.suppressed],
          formulaVersion: formula.version,
          generatedAt: this.nowProvider().toISOString()
        } satisfies LeaderboardScoreSnapshot;
      })
      .filter((row) => row.score > 0 && !row.suppressionFlags.includes("distinct_place_gate"))
      .sort((a, b) => b.score - a.score || b.scoreComponents.trustedActions - a.scoreComponents.trustedActions || a.entityId.localeCompare(b.entityId))
      .map((row, index) => {
        const prev = previous.find((entry) => entry.entityId === row.entityId);
        return { ...row, rank: index + 1, movementDelta: prev ? prev.rank - (index + 1) : 0 };
      });
    this.store.saveSnapshots(type, window, scopeKey, rows);

    void this.notifications?.notify({
      type: "leaderboard.rank.improved",
      recipientUserId: rows[0]?.entityId ?? "system",
      leaderboardType: type,
      window,
      rank: rows[0]?.rank ?? 0
    } as never);
  }

  private toEntityId(type: LeaderboardEntityType, event: LeaderboardContributionEvent): string | undefined {
    if (type === "creator") return event.creatorUserId;
    if (type === "explorer") return event.explorerUserId;
    if (type === "city") return event.normalizedCityId;
    return event.normalizedCategoryId;
  }
}
