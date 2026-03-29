function defaultProgress(userId, collectionId, now) {
    return { userId, collectionId, collectedPlaceIds: [], status: "not_started", updatedAtISO: now, blockedAttempts: 0 };
}
export class CollectionsService {
    store;
    analytics;
    notifications;
    constructor(store, analytics, notifications) {
        this.store = store;
        this.analytics = analytics;
        this.notifications = notifications;
    }
    listAvailableCollections(userId) {
        return this.store.listDefinitions()
            .filter((item) => item.status === "active" && item.visibility === "public")
            .map((item) => this.toSummary(userId, item));
    }
    getCollectionDetail(userId, collectionId) {
        const definition = this.store.getDefinition(collectionId);
        if (!definition || definition.visibility !== "public")
            return null;
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
    upsertDefinition(definition) {
        this.store.saveDefinition(definition);
        return definition;
    }
    async recordActivity(event) {
        if (this.store.hasProcessedEvent(event.eventId))
            return { updated: [], completed: [], ignored: true };
        const updated = [];
        const completed = [];
        for (const definition of this.store.listDefinitions()) {
            if (definition.status !== "active")
                continue;
            if (definition.qualifyingActionType !== event.actionType)
                continue;
            const members = this.resolveMembers(definition);
            if (!members.includes(event.canonicalPlaceId))
                continue;
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
                await this.analytics?.track({ type: "collection_progress_blocked", collectionId: definition.id }, {});
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
            await this.analytics?.track({ type: "collection_progress_updated", collectionId: definition.id, completed: progress.status === "completed" }, {});
        }
        this.store.markProcessedEvent(event.eventId);
        return { updated, completed, ignored: false };
    }
    toSummary(userId, definition) {
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
    resolveMembers(definition) {
        if (definition.source === "curated")
            return [...new Set(definition.explicitPlaceIds ?? [])];
        const rule = definition.rules;
        if (!rule)
            return [];
        const byRule = this.store.listPlaceSnapshots().filter((place) => this.matchesRule(place, rule)).map((place) => place.canonicalPlaceId);
        const stable = [...new Set(byRule)].sort();
        if ((rule.minPlaceCount ?? 0) > stable.length)
            return [];
        return stable;
    }
    matchesRule(place, rule) {
        if (place.deleted)
            return false;
        if (rule.cityId && place.cityId !== rule.cityId)
            return false;
        if (rule.districtId && place.districtId !== rule.districtId)
            return false;
        if (rule.neighborhoodId && place.neighborhoodId !== rule.neighborhoodId)
            return false;
        if (rule.cuisineTags?.length && !rule.cuisineTags.some((tag) => place.cuisineTags.includes(tag)))
            return false;
        if (rule.attractionTags?.length && !rule.attractionTags.some((tag) => place.attractionTags.includes(tag)))
            return false;
        if (rule.sceneTags?.length && !rule.sceneTags.some((tag) => place.sceneTags.includes(tag)))
            return false;
        return true;
    }
    isCompleted(definition, progress) {
        const target = definition.requiredCount ?? this.resolveMembers(definition).length;
        return target > 0 && progress.collectedPlaceIds.length >= target;
    }
    passesGate(definition, event) {
        const gate = definition.trustGate;
        if (!gate)
            return true;
        if (gate.requireTrustedCreator && !event.trustedCreator)
            return false;
        if ((gate.minTrustScore ?? 0) > (event.trustScore ?? 0))
            return false;
        if (gate.maxModerationStrikes != null && (event.moderationStrikes ?? 0) > gate.maxModerationStrikes)
            return false;
        return true;
    }
    passesModerationGate(event) {
        if (event.suspicious)
            return false;
        return !["hidden", "removed", "rejected"].includes(event.moderationState ?? "active");
    }
}
