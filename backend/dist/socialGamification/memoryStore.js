const now = Date.now();
const day = 24 * 60 * 60 * 1000;
export class MemorySocialGamificationStore {
    challengeDefinitions = new Map();
    challengeInstances = new Map();
    goalDefinitions = new Map();
    processedEvents = new Set();
    moments = new Map();
    privacy = new Map();
    goalContributions = new Map();
    actionAudit = [];
    constructor() {
        const def = {
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
        const instance = {
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
    getChallengeDefinition(id) { return this.challengeDefinitions.get(id); }
    listChallengeInstances(userId) { return Array.from(this.challengeInstances.values()).filter((i) => i.audience.participantUserIds.includes(userId)); }
    getChallengeInstance(instanceId) { return this.challengeInstances.get(instanceId); }
    saveChallengeInstance(instance) { this.challengeInstances.set(instance.id, instance); }
    listGoalDefinitions() { return Array.from(this.goalDefinitions.values()); }
    saveGoalDefinition(goal) { this.goalDefinitions.set(goal.id, goal); }
    markProcessedEvent(eventId) { this.processedEvents.add(eventId); }
    hasProcessedEvent(eventId) { return this.processedEvents.has(eventId); }
    listMoments(userId) { return this.moments.get(userId) ?? []; }
    createMoment(moment) {
        const existing = this.moments.get(moment.userId) ?? [];
        existing.unshift(moment);
        this.moments.set(moment.userId, existing.slice(0, 20));
    }
    getPrivacy(userId) { return this.privacy.get(userId); }
    savePrivacy(settings) { this.privacy.set(settings.userId, settings); }
    incrementGoalContribution(goalId, userId, points) {
        const row = this.goalContributions.get(goalId) ?? {};
        row[userId] = (row[userId] ?? 0) + points;
        this.goalContributions.set(goalId, row);
    }
    getGoalContribution(goalId) { return this.goalContributions.get(goalId) ?? {}; }
    saveActionAudit(event, reason) { this.actionAudit.push({ event, reason }); }
    listActionAudit() { return [...this.actionAudit]; }
}
