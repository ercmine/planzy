import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type {
  CanonicalPlaceSnapshot,
  CollectionActivityEvent,
  CollectionDefinition,
  CollectionDetailDto,
  CollectionProgress,
  CollectionStore,
  CollectionSummaryDto
} from "./types.js";

function defaultProgress(userId: string, collectionId: string, now: string): CollectionProgress {
  return { userId, collectionId, collectedPlaceIds: [], status: "not_started", updatedAtISO: now, blockedAttempts: 0 };
}

export class CollectionsService {
  constructor(
    private readonly store: CollectionStore,
    private readonly analytics?: AnalyticsService,
    private readonly notifications?: NotificationService
  ) {}

  listAvailableCollections(userId: string): CollectionSummaryDto[] {
    return this.store.listDefinitions()
      .filter((item) => item.status === "active" && item.visibility === "public")
      .map((item) => this.toSummary(userId, item));
  }

  getCollectionDetail(userId: string, collectionId: string): CollectionDetailDto | null {
    const definition = this.store.getDefinition(collectionId);
    if (!definition || definition.visibility !== "public") return null;
    const summary = this.toSummary(userId, definition);
    const memberIds = this.resolveMembers(definition);
    const progress = this.store.getProgress(userId, collectionId);
    const collected = new Set(progress?.collectedPlaceIds ?? []);
    return {
      ...summary,
      description: definition.description,
      members: memberIds.map((canonicalPlaceId) => ({ canonicalPlaceId, collected: collected.has(canonicalPlaceId) })),
      qualifyingActionType: definition.qualifyingActionType,
      completionDate: progress?.completedAtISO
    };
  }

  upsertDefinition(definition: CollectionDefinition): CollectionDefinition {
    this.store.saveDefinition(definition);
    return definition;
  }

  async recordActivity(event: CollectionActivityEvent): Promise<{ updated: string[]; completed: string[]; ignored: boolean }> {
    if (this.store.hasProcessedEvent(event.eventId)) return { updated: [], completed: [], ignored: true };
    const updated: string[] = [];
    const completed: string[] = [];

    for (const definition of this.store.listDefinitions()) {
      if (definition.status !== "active") continue;
      if (definition.qualifyingActionType !== event.actionType) continue;
      const members = this.resolveMembers(definition);
      if (!members.includes(event.canonicalPlaceId)) continue;

      const now = event.occurredAtISO;
      const progress = this.store.getProgress(event.userId, definition.id) ?? defaultProgress(event.userId, definition.id, now);
      if (progress.collectedPlaceIds.includes(event.canonicalPlaceId)) {
        progress.blockedAttempts += 1;
        this.store.saveProgress(progress);
        continue;
      }
      if (!this.passesGate(definition, event) || !this.passesModerationGate(event)) {
        progress.blockedAttempts += 1;
        this.store.saveProgress(progress);
        await this.analytics?.track({ type: "collection_progress_blocked", collectionId: definition.id } as never, {} as never);
        continue;
      }

      progress.collectedPlaceIds = [...progress.collectedPlaceIds, event.canonicalPlaceId];
      progress.updatedAtISO = now;
      progress.startedAtISO ??= now;
      progress.status = "in_progress";
      updated.push(definition.id);
      if (this.isCompleted(definition, progress)) {
        progress.status = "completed";
        progress.completedAtISO = now;
        if (!progress.rewardGrantedAtISO) {
          progress.rewardGrantedAtISO = now;
          completed.push(definition.id);
          await this.notifications?.notify({ type: "creator.milestone.reached", recipientUserId: event.userId, milestoneKey: `collection:${definition.id}`, milestoneValue: definition.reward?.xp ?? 0 });
        }
      }
      this.store.saveProgress(progress);
      await this.analytics?.track({ type: "collection_progress_updated", collectionId: definition.id, completed: progress.status === "completed" } as never, {} as never);
    }

    this.store.markProcessedEvent(event.eventId);
    return { updated, completed, ignored: false };
  }

  private toSummary(userId: string, definition: CollectionDefinition): CollectionSummaryDto {
    const totalItems = this.resolveMembers(definition).length;
    const progress = this.store.getProgress(userId, definition.id);
    const completedItems = progress?.collectedPlaceIds.length ?? 0;
    const status = progress?.status ?? "not_started";
    return {
      id: definition.id,
      title: definition.title,
      type: definition.type,
      cityId: definition.cityId,
      featured: Boolean(definition.featured),
      rarity: definition.rarity,
      badge: definition.reward?.badgeId,
      totalItems,
      completedItems,
      remainingItems: Math.max(0, totalItems - completedItems),
      status,
      reward: definition.reward
    };
  }

  private resolveMembers(definition: CollectionDefinition): string[] {
    if (definition.source === "curated") return [...new Set(definition.explicitPlaceIds ?? [])];
    const rule = definition.rules;
    if (!rule) return [];
    const byRule = this.store.listPlaceSnapshots().filter((place) => this.matchesRule(place, rule)).map((place) => place.canonicalPlaceId);
    const stable = [...new Set(byRule)].sort();
    if ((rule.minPlaceCount ?? 0) > stable.length) return [];
    return stable;
  }

  private matchesRule(place: CanonicalPlaceSnapshot, rule: NonNullable<CollectionDefinition["rules"]>): boolean {
    if (place.deleted) return false;
    if (rule.cityId && place.cityId !== rule.cityId) return false;
    if (rule.districtId && place.districtId !== rule.districtId) return false;
    if (rule.neighborhoodId && place.neighborhoodId !== rule.neighborhoodId) return false;
    if (rule.cuisineTags?.length && !rule.cuisineTags.some((tag) => place.cuisineTags.includes(tag))) return false;
    if (rule.attractionTags?.length && !rule.attractionTags.some((tag) => place.attractionTags.includes(tag))) return false;
    if (rule.sceneTags?.length && !rule.sceneTags.some((tag) => place.sceneTags.includes(tag))) return false;
    return true;
  }

  private isCompleted(definition: CollectionDefinition, progress: CollectionProgress): boolean {
    const target = definition.requiredCount ?? this.resolveMembers(definition).length;
    return target > 0 && progress.collectedPlaceIds.length >= target;
  }

  private passesGate(definition: CollectionDefinition, event: CollectionActivityEvent): boolean {
    const gate = definition.trustGate;
    if (!gate) return true;
    if (gate.requireTrustedCreator && !event.trustedCreator) return false;
    if ((gate.minTrustScore ?? 0) > (event.trustScore ?? 0)) return false;
    if (gate.maxModerationStrikes != null && (event.moderationStrikes ?? 0) > gate.maxModerationStrikes) return false;
    return true;
  }

  private passesModerationGate(event: CollectionActivityEvent): boolean {
    if (event.suspicious) return false;
    return !["hidden", "removed", "rejected"].includes(event.moderationState ?? "active");
  }
}
