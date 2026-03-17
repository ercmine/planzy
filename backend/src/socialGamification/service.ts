import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { SocialGamificationStore } from "./store.js";
import type {
  CollaborativeGoalDefinition,
  CollaborativeGoalProgress,
  FriendChallengeInstance,
  LightweightCompetitionSummary,
  ShareableMoment,
  SocialActionEvent,
  SocialContributionRule,
  SocialFeedResponse,
  SocialPrivacySettings
} from "./types.js";

export class SocialGamificationService {
  constructor(
    private readonly store: SocialGamificationStore,
    private readonly analytics?: AnalyticsService,
    private readonly notifications?: NotificationService
  ) {}

  getFeed(userId: string, cityId?: string): SocialFeedResponse {
    const friendChallenges = this.store.listChallengeInstances(userId).sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));
    const collaborativeGoals = this.store.listGoalDefinitions()
      .filter((goal) => !cityId || goal.scope.cityId === cityId)
      .map((goal) => ({ ...goal, progress: this.getGoalProgress(goal) }));
    return {
      generatedAt: new Date().toISOString(),
      friendChallenges,
      collaborativeGoals,
      recentMoments: this.store.listMoments(userId),
      competition: this.getCompetitionSummary(userId, cityId)
    };
  }

  upsertGoal(definition: CollaborativeGoalDefinition) {
    this.store.saveGoalDefinition(definition);
    return definition;
  }

  setPrivacy(settings: SocialPrivacySettings): SocialPrivacySettings {
    this.store.savePrivacy(settings);
    return settings;
  }

  getPrivacy(userId: string): SocialPrivacySettings {
    return this.store.getPrivacy(userId) ?? { userId, allowChallengeInvites: true, allowCompetition: true, defaultShareVisibility: "followers" };
  }

  async recordAction(event: SocialActionEvent): Promise<{ ignored: boolean; blockedReason?: string; generatedMomentIds: string[] }> {
    if (this.store.hasProcessedEvent(event.eventId)) return { ignored: true, generatedMomentIds: [] };
    this.store.markProcessedEvent(event.eventId);

    if (event.suspicious) return this.block(event, "suspicious_ring_pattern");

    const generatedMomentIds: string[] = [];

    for (const instance of this.store.listChallengeInstances(event.actorUserId)) {
      const outcome = await this.applyToChallengeInstance(instance, event);
      if (outcome?.momentId) generatedMomentIds.push(outcome.momentId);
    }

    for (const goal of this.store.listGoalDefinitions()) {
      const points = this.pointsForRules(goal.rules, event, this.store.getGoalContribution(goal.id)[event.actorUserId] ?? 0);
      if (points <= 0) continue;
      if (goal.scope.cityId && goal.scope.cityId !== event.cityId) continue;
      if (goal.scope.categoryId && !(event.categoryIds ?? []).includes(goal.scope.categoryId)) continue;
      this.store.incrementGoalContribution(goal.id, event.actorUserId, points);
      const progress = this.getGoalProgress(goal);
      if (progress.currentPoints >= progress.targetPoints && !progress.completedAt) {
        const moment = this.createMoment(event.actorUserId, "city_goal", `City goal complete: ${goal.title}`, "You helped unlock a city milestone.", {
          goalId: goal.id,
          cityId: goal.scope.cityId
        });
        generatedMomentIds.push(moment.id);
      }
    }

    await this.analytics?.track({ type: "social_gamification_action_recorded", eventType: event.type } as never, {} as never);
    return { ignored: false, generatedMomentIds };
  }

  private async applyToChallengeInstance(instance: FriendChallengeInstance, event: SocialActionEvent): Promise<{ momentId?: string } | null> {
    if (instance.status !== "active") return null;
    if (!instance.audience.participantUserIds.includes(event.actorUserId)) return null;
    if (Date.parse(instance.endsAt) < Date.now()) return null;

    const definition = this.store.getChallengeDefinition(instance.definitionId);
    if (!definition) return null;

    const actorProgress = instance.participantProgress[event.actorUserId] ?? { points: 0, distinctPlaceIds: [] };
    const gained = this.pointsForRules(definition.rules, event, actorProgress.points, actorProgress.distinctPlaceIds);
    if (gained <= 0) return null;

    actorProgress.points += gained;
    if (event.canonicalPlaceId && !actorProgress.distinctPlaceIds.includes(event.canonicalPlaceId)) {
      actorProgress.distinctPlaceIds.push(event.canonicalPlaceId);
    }
    const nowIso = new Date().toISOString();
    const completed = Object.values(instance.participantProgress).every((entry) => entry.points >= definition.targetPoints / Math.max(instance.audience.participantUserIds.length, 1));
    if (completed) {
      instance.status = "completed";
      actorProgress.completedAt = nowIso;
      if (definition.mode === "competitive") {
        const sorted = Object.entries(instance.participantProgress).sort((a, b) => b[1].points - a[1].points);
        instance.winnerUserId = sorted[0]?.[0];
      }
      await this.notifications?.notify({ type: "challenge.status.updated", recipientUserId: event.actorUserId, challengeId: instance.id, status: "completed" } as never);
      const moment = this.createMoment(event.actorUserId, "challenge_completion", `Challenge complete: ${definition.title}`, "Shared wins from your social circle.", {
        challengeId: instance.id,
        mode: definition.mode
      });
      instance.updatedAt = nowIso;
      this.store.saveChallengeInstance({ ...instance, participantProgress: { ...instance.participantProgress, [event.actorUserId]: actorProgress } });
      return { momentId: moment.id };
    }

    instance.updatedAt = nowIso;
    this.store.saveChallengeInstance({ ...instance, participantProgress: { ...instance.participantProgress, [event.actorUserId]: actorProgress } });
    return null;
  }

  private pointsForRules(rules: SocialContributionRule[], event: SocialActionEvent, currentPoints: number, distinctPlaceIds: string[] = []): number {
    let gained = 0;
    for (const rule of rules) {
      if (rule.eventType !== event.type) continue;
      if (rule.requireCanonicalPlaceId && !event.canonicalPlaceId) {
        this.store.saveActionAudit(event, "missing_canonical_place");
        continue;
      }
      if ((rule.minTrustScore ?? 0) > (event.trustScore ?? 0)) {
        this.store.saveActionAudit(event, "trust_gate_blocked");
        continue;
      }
      if (rule.allowedContentStates?.length && !rule.allowedContentStates.includes(event.contentState as "published" | "approved")) {
        this.store.saveActionAudit(event, "moderation_state_blocked");
        continue;
      }
      if (rule.maxDailyEvents != null && currentPoints >= rule.maxDailyEvents) {
        this.store.saveActionAudit(event, "daily_cap_reached");
        continue;
      }
      if (rule.distinctPlacesOnly && event.canonicalPlaceId && distinctPlaceIds.includes(event.canonicalPlaceId)) {
        this.store.saveActionAudit(event, "duplicate_place_blocked");
        continue;
      }
      gained += rule.points;
    }
    return gained;
  }

  private getGoalProgress(goal: CollaborativeGoalDefinition): CollaborativeGoalProgress {
    const contributions = this.store.getGoalContribution(goal.id);
    const total = Object.values(contributions).reduce((sum, value) => sum + value, 0);
    const topContributors = Object.entries(contributions).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([userId, points]) => ({ userId, points }));
    return {
      goalId: goal.id,
      currentPoints: total,
      targetPoints: goal.targetPoints,
      percentComplete: Math.min(Math.round((total / Math.max(goal.targetPoints, 1)) * 100), 100),
      participantCount: Object.keys(contributions).length,
      topContributors,
      completedAt: total >= goal.targetPoints ? new Date().toISOString() : undefined
    };
  }

  private getCompetitionSummary(userId: string, cityId?: string): LightweightCompetitionSummary | undefined {
    const privacy = this.getPrivacy(userId);
    if (!privacy.allowCompetition) return undefined;
    const goal = this.store.listGoalDefinitions().find((row) => !cityId || row.scope.cityId === cityId);
    if (!goal) return undefined;
    const row = this.store.getGoalContribution(goal.id);
    const sorted = Object.entries(row).sort((a, b) => b[1] - a[1]);
    const rank = Math.max(sorted.findIndex(([id]) => id === userId), 0) + 1;
    const totalParticipants = Math.max(sorted.length, 1);
    const aheadOfCount = Math.max(totalParticipants - rank, 0);
    const percentile = Math.round((aheadOfCount / totalParticipants) * 100);
    return { userId, circleType: "city", metric: "weekly_points", percentile, rank, totalParticipants, aheadOfCount };
  }

  private block(event: SocialActionEvent, reason: string) {
    this.store.saveActionAudit(event, reason);
    return Promise.resolve({ ignored: false, blockedReason: reason, generatedMomentIds: [] });
  }

  private createMoment(userId: string, type: ShareableMoment["type"], title: string, subtitle: string, metadata: Record<string, string>) {
    const privacy = this.getPrivacy(userId).defaultShareVisibility;
    const moment: ShareableMoment = {
      id: `moment-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      userId,
      type,
      title,
      subtitle,
      imageKey: `share/${type}`,
      privacy,
      metadata,
      createdAt: new Date().toISOString()
    };
    this.store.createMoment(moment);
    return moment;
  }
}
