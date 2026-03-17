import type {
  CollaborativeGoalDefinition,
  FriendChallengeDefinition,
  FriendChallengeInstance,
  ShareableMoment,
  SocialActionEvent,
  SocialPrivacySettings
} from "./types.js";
import type { SocialGamificationStore } from "./store.js";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

export class MemorySocialGamificationStore implements SocialGamificationStore {
  private readonly challengeDefinitions = new Map<string, FriendChallengeDefinition>();
  private readonly challengeInstances = new Map<string, FriendChallengeInstance>();
  private readonly goalDefinitions = new Map<string, CollaborativeGoalDefinition>();
  private readonly processedEvents = new Set<string>();
  private readonly moments = new Map<string, ShareableMoment[]>();
  private readonly privacy = new Map<string, SocialPrivacySettings>();
  private readonly goalContributions = new Map<string, Record<string, number>>();
  private readonly actionAudit: Array<{ event: SocialActionEvent; reason: string }> = [];

  constructor() {
    const def: FriendChallengeDefinition = {
      id: "friend-coffee-weekly",
      slug: "friend-coffee-weekly",
      title: "Coffee Circle Sprint",
      description: "Review 3 distinct coffee places together this week.",
      mode: "collaborative",
      visibility: "followers",
      durationDays: 7,
      targetPoints: 6,
      rewardXp: 180,
      rules: [{ eventType: "review_created", points: 1, distinctPlacesOnly: true, minTrustScore: 50, allowedContentStates: ["published", "approved"], maxDailyEvents: 4, requireCanonicalPlaceId: true }],
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString()
    };
    this.challengeDefinitions.set(def.id, def);

    const instance: FriendChallengeInstance = {
      id: "inst-coffee-u1-u2",
      definitionId: def.id,
      audience: { ownerUserId: "u1", participantUserIds: ["u1", "u2"], followerScoped: true },
      inviteState: "accepted",
      status: "active",
      startsAt: new Date(now - day).toISOString(),
      endsAt: new Date(now + 6 * day).toISOString(),
      participantProgress: { u1: { points: 0, distinctPlaceIds: [] }, u2: { points: 0, distinctPlaceIds: [] } },
      trustFlags: [],
      createdAt: new Date(now - day).toISOString(),
      updatedAt: new Date(now - day).toISOString()
    };
    this.challengeInstances.set(instance.id, instance);

    this.goalDefinitions.set("city-hidden-gems", {
      id: "city-hidden-gems",
      title: "Minneapolis Hidden Gems Save Wave",
      scope: { cityId: "city-minneapolis", categoryId: "hidden_gems" },
      visibility: "public",
      startsAt: new Date(now - day).toISOString(),
      endsAt: new Date(now + 10 * day).toISOString(),
      targetPoints: 1000,
      rules: [{ eventType: "place_saved", points: 1, distinctPlacesOnly: true, minTrustScore: 35, maxDailyEvents: 20, requireCanonicalPlaceId: true }],
      rewardBadgeId: "city-contributor-gems"
    });
  }

  listChallengeDefinitions() { return Array.from(this.challengeDefinitions.values()); }
  getChallengeDefinition(id: string) { return this.challengeDefinitions.get(id); }
  listChallengeInstances(userId: string) { return Array.from(this.challengeInstances.values()).filter((i) => i.audience.participantUserIds.includes(userId)); }
  getChallengeInstance(instanceId: string) { return this.challengeInstances.get(instanceId); }
  saveChallengeInstance(instance: FriendChallengeInstance) { this.challengeInstances.set(instance.id, instance); }

  listGoalDefinitions() { return Array.from(this.goalDefinitions.values()); }
  saveGoalDefinition(goal: CollaborativeGoalDefinition) { this.goalDefinitions.set(goal.id, goal); }

  markProcessedEvent(eventId: string) { this.processedEvents.add(eventId); }
  hasProcessedEvent(eventId: string) { return this.processedEvents.has(eventId); }

  listMoments(userId: string) { return this.moments.get(userId) ?? []; }
  createMoment(moment: ShareableMoment) {
    const existing = this.moments.get(moment.userId) ?? [];
    existing.unshift(moment);
    this.moments.set(moment.userId, existing.slice(0, 20));
  }

  getPrivacy(userId: string) { return this.privacy.get(userId); }
  savePrivacy(settings: SocialPrivacySettings) { this.privacy.set(settings.userId, settings); }

  incrementGoalContribution(goalId: string, userId: string, points: number) {
    const row = this.goalContributions.get(goalId) ?? {};
    row[userId] = (row[userId] ?? 0) + points;
    this.goalContributions.set(goalId, row);
  }

  getGoalContribution(goalId: string) { return this.goalContributions.get(goalId) ?? {}; }

  saveActionAudit(event: SocialActionEvent, reason: string): void { this.actionAudit.push({ event, reason }); }
  listActionAudit() { return [...this.actionAudit]; }
}
