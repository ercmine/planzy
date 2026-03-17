import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { AccomplishmentsStore } from "./store.js";
import type { AccomplishmentDefinition, AccomplishmentEvent, UnlockMoment, UserAccomplishmentState } from "./types.js";

function defaultState(userId: string): UserAccomplishmentState {
  return {
    userId,
    earnedDefinitionIds: [],
    tierProgress: {},
    featuredBadgeIds: [],
    stats: {
      reviewsCount: 0,
      videosPublishedCount: 0,
      savedPlaceIds: [],
      exploredCityIds: [],
      helpfulReviewsCount: 0,
      trustedCreator: false,
      trustedReviewsCount: 0,
      creatorStreakDays: 0,
      distinctReviewedCategories: [],
      moderationStrikes: 0,
      trustScore: 0
    },
    collectibleProgress: {}
  };
}

export class AccomplishmentsService {
  constructor(
    private readonly store: AccomplishmentsStore,
    private readonly analyticsService?: AnalyticsService,
    private readonly notificationService?: NotificationService
  ) {}

  getCatalog() {
    return this.store.listDefinitions();
  }

  getUserSummary(userId: string) {
    const state = this.store.getUserState(userId) ?? defaultState(userId);
    const definitions = this.store.listDefinitions();
    const earned = definitions.filter((row) => state.earnedDefinitionIds.includes(row.id));
    const featured = earned.filter((row) => state.featuredBadgeIds.includes(row.id));
    const progress = definitions.map((definition) => ({
      definitionId: definition.id,
      current: this.metricValue(definition.condition?.metric, state),
      target: definition.condition?.threshold,
      tier: state.tierProgress[definition.id] ?? 0,
      earned: state.earnedDefinitionIds.includes(definition.id)
    }));
    return { stats: state.stats, earned, featured, progress, collectibles: state.collectibleProgress };
  }

  setFeaturedBadges(userId: string, badgeIds: string[]) {
    const state = this.store.getUserState(userId) ?? defaultState(userId);
    state.featuredBadgeIds = badgeIds.filter((id) => state.earnedDefinitionIds.includes(id)).slice(0, 3);
    this.store.saveUserState(state);
    return state.featuredBadgeIds;
  }

  async recordEvent(event: AccomplishmentEvent): Promise<{ unlocks: UnlockMoment[]; ignored: boolean }> {
    if (this.store.hasProcessedEvent(event.eventId)) {
      return { unlocks: [], ignored: true };
    }
    const state = this.store.getUserState(event.userId) ?? defaultState(event.userId);

    const accepted = this.applyEvent(state, event);
    this.store.markProcessedEvent(event.eventId);
    if (!accepted) {
      try {
        await this.analyticsService?.track({ type: "accomplishment_event_blocked", reason: "anti_spam_or_quality", eventType: event.type } as never, {} as never);
      } catch {}
      this.store.saveUserState(state);
      return { unlocks: [], ignored: false };
    }

    const unlocks = this.evaluateUnlocks(state);
    this.store.saveUserState(state);

    for (const unlock of unlocks) {
      try {
        await this.analyticsService?.track({ type: "accomplishment_unlocked", definitionId: unlock.definitionId, kind: unlock.kind } as never, {} as never);
      } catch {}
      try {
        await this.notificationService?.notify({
          type: "creator.milestone.reached",
          recipientUserId: event.userId,
          milestoneKey: unlock.definitionId,
          milestoneValue: unlock.tier ?? 1
        });
      } catch {}
    }

    return { unlocks, ignored: false };
  }

  private applyEvent(state: UserAccomplishmentState, event: AccomplishmentEvent): boolean {
    if (event.type === "review_created") {
      if (event.contributionState && event.contributionState !== "published") return false;
      if (event.canonicalPlaceId) {
        const key = `review:${event.canonicalPlaceId}`;
        if ((state.collectibleProgress["__reviewedPlaceIds"] ?? []).includes(key)) return false;
        state.collectibleProgress["__reviewedPlaceIds"] = [...(state.collectibleProgress["__reviewedPlaceIds"] ?? []), key];
      }
      state.stats.reviewsCount += 1;
      if (event.categoryId && !state.stats.distinctReviewedCategories.includes(event.categoryId)) state.stats.distinctReviewedCategories.push(event.categoryId);
      if (event.cityId && !state.stats.exploredCityIds.includes(event.cityId)) state.stats.exploredCityIds.push(event.cityId);
    }
    if (event.type === "video_published") {
      if (event.contributionState && event.contributionState !== "published") return false;
      state.stats.videosPublishedCount += 1;
      state.stats.creatorStreakDays = Math.max(state.stats.creatorStreakDays, event.value ?? 1);
    }
    if (event.type === "place_saved") {
      if (!event.canonicalPlaceId) return false;
      if (state.stats.savedPlaceIds.includes(event.canonicalPlaceId)) return false;
      state.stats.savedPlaceIds.push(event.canonicalPlaceId);
    }
    if (event.type === "place_explored") {
      if (!event.cityId) return false;
      if (!state.stats.exploredCityIds.includes(event.cityId)) state.stats.exploredCityIds.push(event.cityId);
    }
    if (event.type === "review_helpful") {
      state.stats.helpfulReviewsCount += Math.max(1, event.value ?? 1);
      state.stats.trustedReviewsCount += Math.max(1, event.value ?? 1);
      state.stats.trustScore += 5;
    }
    if (event.type === "trust_state_changed") {
      state.stats.trustedCreator = Boolean(event.trustedCreator);
      state.stats.trustScore += event.trustScoreDelta ?? 0;
    }
    if (event.type === "moderation_strike") {
      state.stats.moderationStrikes += 1;
      state.stats.trustScore = Math.max(0, state.stats.trustScore - 30);
    }

    this.updateCollectibles(state, event);
    return true;
  }

  private updateCollectibles(state: UserAccomplishmentState, event: AccomplishmentEvent) {
    if (!event.canonicalPlaceId) return;
    for (const definition of this.store.listDefinitions()) {
      if (definition.kind !== "collectible" || !definition.collectible) continue;
      const c = definition.collectible;
      if (c.cityId && event.cityId !== c.cityId) continue;
      if (c.requiredPlaceIds && c.requiredPlaceIds.includes(event.canonicalPlaceId)) {
        const current = new Set(state.collectibleProgress[definition.id] ?? []);
        current.add(event.canonicalPlaceId);
        state.collectibleProgress[definition.id] = [...current];
      }
    }
  }

  private evaluateUnlocks(state: UserAccomplishmentState): UnlockMoment[] {
    const unlocks: UnlockMoment[] = [];
    for (const definition of this.store.listDefinitions()) {
      if (definition.kind === "collectible") {
        const progress = new Set(state.collectibleProgress[definition.id] ?? []);
        const required = new Set(definition.collectible?.requiredPlaceIds ?? []);
        if (required.size > 0 && progress.size >= required.size && !state.earnedDefinitionIds.includes(definition.id)) {
          state.earnedDefinitionIds.push(definition.id);
          unlocks.push({ definitionId: definition.id, kind: definition.kind, name: definition.name });
        }
        continue;
      }

      if (definition.tiers?.length) {
        const eligibleTier = definition.tiers
          .filter((tier) => this.metricValue(tier.condition.metric, state) >= tier.condition.threshold)
          .map((tier) => tier.tier)
          .sort((a, b) => b - a)[0] ?? 0;
        const priorTier = state.tierProgress[definition.id] ?? 0;
        if (eligibleTier > priorTier) {
          state.tierProgress[definition.id] = eligibleTier;
          unlocks.push({ definitionId: definition.id, kind: definition.kind, name: definition.name, tier: eligibleTier });
        }
        continue;
      }

      if (!definition.condition || state.earnedDefinitionIds.includes(definition.id)) continue;
      if (!this.passesTrustGate(definition, state)) continue;
      if (this.metricValue(definition.condition.metric, state) >= definition.condition.threshold) {
        state.earnedDefinitionIds.push(definition.id);
        unlocks.push({ definitionId: definition.id, kind: definition.kind, name: definition.name });
      }
    }
    return unlocks;
  }

  private passesTrustGate(definition: AccomplishmentDefinition, state: UserAccomplishmentState): boolean {
    const gate = definition.trustGate;
    if (!gate) return true;
    if (gate.requireTrustedCreator && !state.stats.trustedCreator) return false;
    if ((gate.minTrustScore ?? 0) > state.stats.trustScore) return false;
    if (gate.maxModerationStrikes != null && state.stats.moderationStrikes > gate.maxModerationStrikes) return false;
    return true;
  }

  private metricValue(metric: string | undefined, state: UserAccomplishmentState): number {
    switch (metric) {
      case "reviews_count": return state.stats.reviewsCount;
      case "videos_published_count": return state.stats.videosPublishedCount;
      case "saved_places_count": return state.stats.savedPlaceIds.length;
      case "distinct_cities_explored": return state.stats.exploredCityIds.length;
      case "helpful_reviews_count": return state.stats.helpfulReviewsCount;
      case "trusted_creator_state": return state.stats.trustedCreator ? 1 : 0;
      case "trusted_reviews_count": return state.stats.trustedReviewsCount;
      case "creator_streak_days": return state.stats.creatorStreakDays;
      case "distinct_categories_reviewed": return state.stats.distinctReviewedCategories.length;
      default: return 0;
    }
  }
}
