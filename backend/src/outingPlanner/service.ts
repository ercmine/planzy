import { randomUUID } from "node:crypto";

import type { CreatorStore } from "../creator/store.js";
import type { PlaceDocument } from "../discovery/types.js";
import { ValidationError } from "../plans/errors.js";
import { FEATURE_KEYS, QUOTA_KEYS, type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { PlanTier, SubscriptionTargetType } from "../subscriptions/types.js";
import { normalizeRequest } from "./normalization.js";
import { cloneItinerary, type OutingPlannerStore } from "./store.js";
import type { GeneratedItinerary, ItineraryRegenerationRequest, ItinerarySourceAttribution, ItineraryStop, ItineraryUsageLimits, OutingPlannerRequest, SavedItinerary } from "./types.js";

export interface PlannerDeps {
  listPlaces(): Promise<PlaceDocument[]>;
  creatorStore: CreatorStore;
  store: OutingPlannerStore;
  subscriptions: SubscriptionService;
  access: FeatureQuotaEngine;
}

export class OutingPlannerService {
  constructor(private readonly deps: PlannerDeps) {}

  async createOutingPlan(userId: string, request: OutingPlannerRequest) {
    await this.enforceQuota(userId, QUOTA_KEYS.AI_REQUESTS_PER_DAY);
    await this.enforceQuota(userId, QUOTA_KEYS.AI_REQUESTS_PER_MONTH);

    const planTier = this.resolvePlanTier(userId);
    const normalized = normalizeRequest(request);
    const followedCreatorIds = this.deps.creatorStore.listFollowedCreatorIds(userId);
    const allPlaces = await this.deps.listPlaces();

    const filtered = allPlaces.filter((place) => this.includePlace(place, normalized, followedCreatorIds));
    const scored = filtered
      .map((place) => ({ place, score: this.scorePlace(place, normalized, followedCreatorIds) }))
      .sort((a, b) => b.score - a.score);

    const maxStops = Math.max(2, Math.min(8, Math.floor((normalized.durationMinutes ?? 240) / 90)));
    const picked = scored.slice(0, Math.max(6, maxStops * 2));
    const sequence = this.sequenceStops(picked.map((row) => row.place), maxStops);

    const itinerary = this.buildItinerary(sequence, normalized, planTier, followedCreatorIds, picked.length === 0);
    await this.deps.access.consumeQuota(this.target(userId), QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1);
    await this.deps.access.consumeQuota(this.target(userId), QUOTA_KEYS.AI_REQUESTS_PER_MONTH, 1);
    return itinerary;
  }

  async saveOutingPlan(userId: string, generated: GeneratedItinerary, title?: string) {
    const quota = await this.deps.access.checkQuotaAccess(this.target(userId), QUOTA_KEYS.LISTS_SAVED_LISTS, 1);
    if (!quota.allowed) return { error: "saved_itinerary_limit_reached", access: quota } as const;

    const saved = await this.deps.store.createSavedItinerary({
      ownerUserId: userId,
      title: title?.trim() || generated.title,
      visibility: "private",
      archived: false,
      favorite: false,
      activeRevisionId: ""
    });
    const revision = await this.deps.store.addRevision({ itineraryId: saved.id, revisionNumber: 1, source: "generated", generated });
    saved.activeRevisionId = revision.id;
    await this.deps.store.updateSavedItinerary(saved);
    await this.deps.access.consumeQuota(this.target(userId), QUOTA_KEYS.LISTS_SAVED_LISTS, 1);
    return { saved, revision } as const;
  }

  async listSavedItineraries(userId: string) {
    return this.deps.store.listSavedItinerariesByUser(userId);
  }

  async getSavedItinerary(userId: string, itineraryId: string) {
    const itinerary = await this.requireOwnedItinerary(userId, itineraryId);
    const revisions = await this.deps.store.listRevisions(itinerary.id);
    const activeRevision = revisions.find((row) => row.id === itinerary.activeRevisionId) ?? revisions.at(-1);
    return { itinerary, revisions, activeRevision };
  }

  async updateSavedItinerary(userId: string, itineraryId: string, patch: Partial<Pick<SavedItinerary, "title" | "favorite" | "archived" | "visibility">>) {
    const itinerary = await this.requireOwnedItinerary(userId, itineraryId);
    if (typeof patch.title === "string" && patch.title.trim()) itinerary.title = patch.title.trim();
    if (typeof patch.favorite === "boolean") itinerary.favorite = patch.favorite;
    if (typeof patch.archived === "boolean") itinerary.archived = patch.archived;
    if (patch.visibility) itinerary.visibility = patch.visibility;
    await this.deps.store.updateSavedItinerary(itinerary);
    return itinerary;
  }

  async regenerateItinerary(userId: string, request: ItineraryRegenerationRequest) {
    const quota = await this.deps.access.checkQuotaAccess(this.target(userId), QUOTA_KEYS.AI_REQUESTS_PER_DAY, 1);
    if (!quota.allowed) return { error: "regeneration_limit_reached", access: quota } as const;

    if (!request.itineraryId) throw new ValidationError(["itineraryId is required"]);
    const existing = await this.getSavedItinerary(userId, request.itineraryId);
    const active = existing.activeRevision?.generated;
    if (!active) throw new ValidationError(["active revision missing"]);

    const prompt = `${active.summary} ${request.promptDelta ?? ""}`.trim();
    const regenerated = await this.createOutingPlan(userId, { city: active.city, prompt, durationMinutes: active.estimatedDurationMinutes, vibeTags: active.themeTags });

    if (request.replaceStopId) {
      const replacement = regenerated.stops[0];
      const next = cloneItinerary(active);
      next.stops = next.stops.map((stop) => stop.id === request.replaceStopId ? { ...replacement, id: stop.id, sequence: stop.sequence } : stop);
      return this.persistRevision(existing.itinerary, next, "regenerated");
    }

    return this.persistRevision(existing.itinerary, regenerated, "regenerated");
  }

  async deleteSavedItinerary(userId: string, itineraryId: string) {
    await this.requireOwnedItinerary(userId, itineraryId);
    await this.deps.store.deleteSavedItinerary(itineraryId);
    return { ok: true };
  }

  async getItineraryUsageLimits(userId: string): Promise<ItineraryUsageLimits> {
    const planTier = this.resolvePlanTier(userId);
    const target = this.target(userId);
    const [day, month, save] = await Promise.all([
      this.deps.access.checkQuotaAccess(target, QUOTA_KEYS.AI_REQUESTS_PER_DAY, 0),
      this.deps.access.checkQuotaAccess(target, QUOTA_KEYS.AI_REQUESTS_PER_MONTH, 0),
      this.deps.access.checkQuotaAccess(target, QUOTA_KEYS.LISTS_SAVED_LISTS, 0)
    ]);

    return {
      planTier,
      generations: { used: day.currentUsage ?? 0, limit: day.limit ?? 0 },
      regenerations: { used: month.currentUsage ?? 0, limit: month.limit ?? 0 },
      savedItineraries: { used: save.currentUsage ?? 0, limit: save.limit ?? 0 }
    };
  }

  private async persistRevision(itinerary: SavedItinerary, generated: GeneratedItinerary, source: "edited" | "regenerated") {
    const revisions = await this.deps.store.listRevisions(itinerary.id);
    const revision = await this.deps.store.addRevision({
      itineraryId: itinerary.id,
      revisionNumber: (revisions.at(-1)?.revisionNumber ?? 0) + 1,
      source,
      generated
    });
    itinerary.activeRevisionId = revision.id;
    await this.deps.store.updateSavedItinerary(itinerary);
    return { itinerary, revision };
  }

  private async requireOwnedItinerary(userId: string, itineraryId: string) {
    const itinerary = await this.deps.store.getSavedItinerary(itineraryId);
    if (!itinerary || itinerary.ownerUserId !== userId) throw new ValidationError(["itinerary not found"]);
    return itinerary;
  }

  private includePlace(place: PlaceDocument, request: OutingPlannerRequest, followedCreatorIds: string[]): boolean {
    if (place.moderationState === "suppressed" || place.isClosed) return false;
    if (request.city && String(place.city ?? "").toLowerCase() !== request.city.toLowerCase()) return false;
    if (request.exclusions?.includes(place.primaryCategory.toLowerCase())) return false;
    if (request.categoryPreferences?.length && !request.categoryPreferences.includes(place.primaryCategory.toLowerCase())) return false;
    if (request.creatorOnly && (!place.creatorId || !followedCreatorIds.includes(place.creatorId))) return false;
    return true;
  }

  private scorePlace(place: PlaceDocument, request: OutingPlannerRequest, followedCreatorIds: string[]): number {
    let score = place.qualityScore * 0.45 + place.trendingScore * 0.2 + place.popularityScore * 0.15;
    if (request.budgetLevel === "low" && (place.priceLevel ?? 2) <= 1) score += 0.15;
    if (request.budgetLevel === "high" && (place.priceLevel ?? 1) >= 3) score += 0.12;
    if (request.groupType === "family" && !["bar", "nightlife"].includes(place.primaryCategory.toLowerCase())) score += 0.1;
    if (place.openNow) score += 0.07;
    if (place.creatorId && followedCreatorIds.includes(place.creatorId)) score += 0.08;
    return score;
  }

  private sequenceStops(places: PlaceDocument[], maxStops: number): PlaceDocument[] {
    const deduped = new Set<string>();
    const picks: PlaceDocument[] = [];
    const sorted = [...places].sort((a, b) => a.primaryCategory.localeCompare(b.primaryCategory));
    for (const place of sorted) {
      if (deduped.has(place.canonicalPlaceId)) continue;
      if (picks.some((row) => row.primaryCategory === place.primaryCategory)) continue;
      deduped.add(place.canonicalPlaceId);
      picks.push(place);
      if (picks.length >= maxStops) break;
    }
    return picks.length > 0 ? picks : places.slice(0, maxStops);
  }

  private buildItinerary(places: PlaceDocument[], request: OutingPlannerRequest, planTier: PlanTier, followedCreatorIds: string[], degradedMode: boolean): GeneratedItinerary {
    if (places.length === 0) {
      return {
        id: `gen_${randomUUID()}`,
        title: "No viable outing found",
        summary: "We could not find matching places. Try broadening filters or changing city.",
        city: request.city,
        region: request.neighborhood,
        themeTags: request.vibeTags ?? [],
        estimatedDurationMinutes: 0,
        estimatedBudgetRange: request.budgetLevel ?? "medium",
        generatedAt: new Date().toISOString(),
        generationSource: { model: "heuristic-fallback", degradedMode: true },
        planTierUsed: planTier,
        stops: [],
        metadata: { totalPlaces: 0, routeShape: "clustered", indoorOutdoorMix: "mixed", hasMeal: false, hasCoffee: false, hasEntertainment: false, costBucket: "medium", moderationStatus: "filtered", personalizationReasons: [], sourceAttributions: [] }
      };
    }

    const stops: ItineraryStop[] = places.map((place, index) => {
      const creatorAttribution = place.creatorId && followedCreatorIds.includes(place.creatorId) ? `Inspired by creator ${place.creatorId}` : undefined;
      const businessAttribution = place.sourceAttribution.some((source) => source.includes("business") || source.includes("verified")) ? "Verified business profile" : undefined;
      return {
        id: `stop_${randomUUID()}`,
        sequence: index + 1,
        placeId: place.canonicalPlaceId,
        placeTitle: place.name,
        category: place.primaryCategory,
        area: place.neighborhood,
        address: place.city,
        relativeStartMinutes: index * 90,
        estimatedDurationMinutes: 75,
        shortDescription: place.shortDescription ?? `${place.primaryCategory} stop in ${place.city ?? "the area"}`,
        reasonIncluded: `High quality ${place.primaryCategory} option aligned to your request`,
        websiteUrl: undefined,
        thumbnailUrl: place.imageUrls[0],
        transitionNote: index === 0 ? undefined : "Short transfer to the next nearby stop",
        creatorAttribution,
        businessAttribution,
        confidence: Number((place.qualityScore * 0.7 + place.popularityScore * 0.3).toFixed(2))
      };
    });

    const sourceAttributions: ItinerarySourceAttribution[] = places.flatMap((place) => {
      const rows: ItinerarySourceAttribution[] = [{ sourceType: "place", sourceId: place.canonicalPlaceId, label: place.name }];
      if (place.creatorId) rows.push({ sourceType: "creator", sourceId: place.creatorId, label: "creator source" });
      return rows;
    });

    return {
      id: `gen_${randomUUID()}`,
      title: request.prompt ? request.prompt.slice(0, 52) : `${request.vibeTags?.[0] ?? "Curated"} outing plan`,
      summary: `A ${request.budgetLevel ?? "balanced"} ${request.groupType ?? "group"} itinerary across ${request.city ?? "your area"} with ${stops.length} stops.`,
      city: request.city,
      region: request.neighborhood,
      themeTags: request.vibeTags ?? [],
      estimatedDurationMinutes: stops.length * 90,
      estimatedBudgetRange: request.budgetLevel ?? "medium",
      generatedAt: new Date().toISOString(),
      generationSource: { model: degradedMode ? "heuristic-fallback" : "grounded-planner-v1", degradedMode },
      planTierUsed: planTier,
      stops,
      metadata: {
        totalPlaces: stops.length,
        routeShape: "clustered",
        indoorOutdoorMix: request.indoorOutdoorPreference ?? "mixed",
        hasMeal: stops.some((stop) => ["restaurant", "food"].includes(stop.category.toLowerCase())),
        hasCoffee: stops.some((stop) => stop.category.toLowerCase().includes("coffee")),
        hasEntertainment: stops.some((stop) => ["museum", "movie", "nightlife"].includes(stop.category.toLowerCase())),
        costBucket: request.budgetLevel ?? "medium",
        moderationStatus: "clean",
        personalizationReasons: [
          { code: "city_context", description: "Matched to your city context" },
          { code: "creator_affinity", description: "Boosted places from followed creators" }
        ],
        sourceAttributions
      }
    };
  }

  private resolvePlanTier(userId: string): PlanTier {
    this.deps.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
    const code = this.deps.subscriptions.getCurrentSubscriptionSummary(userId).planCode.toLowerCase();
    if (code.includes("elite")) return PlanTier.ELITE;
    if (code.includes("plus")) return PlanTier.PLUS;
    if (code.includes("pro")) return PlanTier.PRO;
    return PlanTier.FREE;
  }

  private target(userId: string) {
    this.deps.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
    return { targetType: SubscriptionTargetType.USER, targetId: userId };
  }

  private async enforceQuota(userId: string, key: typeof QUOTA_KEYS.AI_REQUESTS_PER_DAY | typeof QUOTA_KEYS.AI_REQUESTS_PER_MONTH) {
    const aiFeature = await this.deps.access.checkFeatureAccess(this.target(userId), FEATURE_KEYS.AI_TRIP_ASSISTANT);
    if (!aiFeature.allowed) throw new ValidationError(["AI itinerary generation is not enabled for this plan"]);
    const quota = await this.deps.access.checkQuotaAccess(this.target(userId), key, 1);
    if (!quota.allowed) throw new ValidationError(["Itinerary generation limit reached"]);
  }
}
