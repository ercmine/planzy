import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { ChallengesStore } from "./store.js";
import type { ChallengeDefinition, ChallengeEvent, ChallengeProgress, UserChallengeState } from "./types.js";

function defaultState(userId: string): UserChallengeState {
  return { userId, byChallengeId: {} };
}

export class ChallengesService {
  constructor(
    private readonly store: ChallengesStore,
    private readonly analyticsService?: AnalyticsService,
    private readonly notifications?: NotificationService
  ) {}

  listAvailable(userId: string, filters?: { cityId?: string; neighborhoodId?: string; categoryId?: string; track?: string }) {
    const now = Date.now();
    const defs = this.store.listDefinitions().filter((row) => row.visibility === "public" && row.status === "active")
      .filter((row) => !row.startsAt || Date.parse(row.startsAt) <= now)
      .filter((row) => !row.endsAt || Date.parse(row.endsAt) >= now)
      .filter((row) => !filters?.track || row.track === filters.track || row.track === "mixed")
      .filter((row) => !filters?.cityId || row.criteria.some((criterion) => (criterion.scope?.cityIds ?? []).includes(filters.cityId!)))
      .filter((row) => !filters?.neighborhoodId || row.criteria.some((criterion) => (criterion.scope?.neighborhoodIds ?? []).includes(filters.neighborhoodId!)))
      .filter((row) => !filters?.categoryId || row.criteria.some((criterion) => (criterion.scope?.categoryIds ?? []).includes(filters.categoryId!)));

    return defs.map((row) => ({ ...row, progress: this.getProgressForChallenge(userId, row.id) }));
  }

  getSummary(userId: string) {
    const challenges = this.listAvailable(userId);
    const completed = challenges.filter((item) => item.progress.status === "completed");
    const inProgress = challenges.filter((item) => item.progress.status === "in_progress");
    return {
      totalAvailable: challenges.length,
      completed: completed.length,
      inProgress: inProgress.length,
      tracks: {
        explorer: challenges.filter((item) => item.track === "explorer").length,
        creator: challenges.filter((item) => item.track === "creator").length,
        mixed: challenges.filter((item) => item.track === "mixed").length
      },
      featuredLocales: challenges.map((item) => item.neighborhoodLabel ?? item.cityLabel).filter((item): item is string => Boolean(item)).slice(0, 4)
    };
  }

  getChallengeDetail(userId: string, challengeId: string) {
    const definition = this.store.getDefinition(challengeId);
    if (!definition) return null;
    return { ...definition, progress: this.getProgressForChallenge(userId, challengeId) };
  }

  upsertDefinition(definition: ChallengeDefinition): ChallengeDefinition {
    this.store.upsertDefinition({ ...definition, updatedAt: new Date().toISOString() });
    return definition;
  }

  async recordEvent(event: ChallengeEvent): Promise<{ ignored: boolean; completedChallengeIds: string[]; blockedReason?: string }> {
    if (this.store.hasProcessedEvent(event.eventId)) return { ignored: true, completedChallengeIds: [] };
    this.store.markProcessedEvent(event.eventId);

    if (event.suspicious) {
      await this.trackBlocked(event, "suspicious_event");
      return { ignored: false, completedChallengeIds: [], blockedReason: "suspicious_event" };
    }

    const state = this.store.getUserState(event.userId) ?? defaultState(event.userId);
    const completedChallengeIds: string[] = [];

    for (const definition of this.store.listDefinitions()) {
      if (definition.status !== "active") continue;
      const challengeState = state.byChallengeId[definition.id] ?? {
        progressByCriterionId: {},
        canonicalPlaceIdsByCriterionId: {},
        eventCountByDayByCriterionId: {}
      };
      if (challengeState.completedAt) continue;

      let changed = false;
      for (const criterion of definition.criteria) {
        if (criterion.eventType !== event.type) continue;
        if (!this.eventMatchesScope(event, criterion.scope)) continue;
        if (criterion.allowedContentStates?.length && !criterion.allowedContentStates.includes(event.contentState ?? "pending")) {
          await this.trackBlocked(event, "content_state_blocked");
          continue;
        }
        if ((criterion.minTrustScore ?? 0) > (event.trustScore ?? 0)) {
          await this.trackBlocked(event, "trust_gate_blocked");
          continue;
        }

        const day = (event.occurredAt ?? new Date().toISOString()).slice(0, 10);
        const dayMap = challengeState.eventCountByDayByCriterionId[criterion.id] ?? {};
        const currentDayCount = dayMap[day] ?? 0;
        if (criterion.maxEventsPerDay != null && currentDayCount >= criterion.maxEventsPerDay) {
          await this.trackBlocked(event, "criterion_daily_cooldown");
          continue;
        }

        const seenPlaces = new Set(challengeState.canonicalPlaceIdsByCriterionId[criterion.id] ?? []);
        if (criterion.distinctPlacesOnly && seenPlaces.has(event.canonicalPlaceId)) {
          await this.trackBlocked(event, "distinct_place_required");
          continue;
        }

        dayMap[day] = currentDayCount + 1;
        challengeState.eventCountByDayByCriterionId[criterion.id] = dayMap;
        if (criterion.distinctPlacesOnly) {
          seenPlaces.add(event.canonicalPlaceId);
          challengeState.canonicalPlaceIdsByCriterionId[criterion.id] = Array.from(seenPlaces);
        }
        challengeState.progressByCriterionId[criterion.id] = Math.min((challengeState.progressByCriterionId[criterion.id] ?? 0) + 1, criterion.target);
        changed = true;
      }

      if (changed) {
        state.byChallengeId[definition.id] = challengeState;
        const progress = this.getProgressForChallenge(event.userId, definition.id, state);
        if (progress.status === "completed") {
          challengeState.completedAt = new Date().toISOString();
          completedChallengeIds.push(definition.id);
          await this.emitCompletionSignals(event.userId, definition);
        }
      }
    }

    this.store.saveUserState(state);
    return { ignored: false, completedChallengeIds };
  }

  private getProgressForChallenge(userId: string, challengeId: string, inMemoryState?: UserChallengeState): ChallengeProgress {
    const definition = this.store.getDefinition(challengeId);
    if (!definition) {
      return { challengeId, status: "expired", criteria: [], qualifyingActions: 0 };
    }
    const state = inMemoryState ?? this.store.getUserState(userId) ?? defaultState(userId);
    const challengeState = state.byChallengeId[challengeId];

    const criteria = definition.criteria.map((criterion) => {
      const current = challengeState?.progressByCriterionId[criterion.id] ?? 0;
      return { criterionId: criterion.id, current, target: criterion.target, remaining: Math.max(criterion.target - current, 0) };
    });
    const qualifyingActions = criteria.reduce((sum, item) => sum + item.current, 0);

    const now = Date.now();
    const expired = Boolean(definition.endsAt && Date.parse(definition.endsAt) < now);
    const completed = criteria.every((item) => item.current >= item.target);
    return {
      challengeId,
      status: expired ? "expired" : completed ? "completed" : qualifyingActions > 0 ? "in_progress" : "available",
      completedAt: challengeState?.completedAt,
      criteria,
      qualifyingActions
    };
  }

  private eventMatchesScope(event: ChallengeEvent, scope?: { cityIds?: string[]; neighborhoodIds?: string[]; categoryIds?: string[]; hotspotIds?: string[]; canonicalPlaceIds?: string[] }): boolean {
    if (!scope) return true;
    if (scope.cityIds?.length && (!event.cityId || !scope.cityIds.includes(event.cityId))) return false;
    if (scope.neighborhoodIds?.length && (!event.neighborhoodId || !scope.neighborhoodIds.includes(event.neighborhoodId))) return false;
    if (scope.categoryIds?.length && !(event.categoryIds ?? []).some((item) => scope.categoryIds!.includes(item))) return false;
    if (scope.hotspotIds?.length && !(event.hotspotIds ?? []).some((item) => scope.hotspotIds!.includes(item))) return false;
    if (scope.canonicalPlaceIds?.length && !scope.canonicalPlaceIds.includes(event.canonicalPlaceId)) return false;
    return true;
  }

  private async emitCompletionSignals(userId: string, definition: ChallengeDefinition) {
    try {
      await this.analyticsService?.track({ type: "challenge_completed", challengeId: definition.id, track: definition.track, scopeType: definition.scopeType } as never, {} as never);
    } catch {}

    try {
      if (definition.track === "creator") {
        await this.notifications?.notify({ type: "creator.milestone.reached", recipientUserId: userId, milestoneKey: `challenge:${definition.id}`, milestoneValue: definition.reward.xp });
      } else {
        await this.notifications?.notify({ type: "discovery.local.highlights", recipientUserId: userId, city: definition.cityLabel ?? "your city", highlightsCount: 1 });
      }
    } catch {}
  }

  private async trackBlocked(event: ChallengeEvent, reason: string) {
    try {
      await this.analyticsService?.track({ type: "challenge_progress_blocked", reason, challengeEventType: event.type } as never, {} as never);
    } catch {}
  }
}
