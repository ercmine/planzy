function defaultState(userId) {
    return { userId, byChallengeId: {} };
}
export class ChallengesService {
    store;
    analyticsService;
    notifications;
    constructor(store, analyticsService, notifications) {
        this.store = store;
        this.analyticsService = analyticsService;
        this.notifications = notifications;
    }
    isActive(definition, at = Date.now()) {
        return definition.status === "active" && Date.parse(definition.startsAt) <= at && Date.parse(definition.endsAt) >= at && !definition.liveOps.previewOnly;
    }
    listAvailable(userId, filters) {
        const now = Date.now();
        const defs = this.store.listDefinitions().filter((row) => row.visibility === "public")
            .filter((row) => this.isActive(row, now))
            .filter((row) => !filters?.cadence || row.cadence === filters.cadence)
            .filter((row) => !filters?.track || row.track === filters.track || row.track === "mixed")
            .filter((row) => !filters?.cityId || (row.scope.cityIds ?? []).includes(filters.cityId))
            .filter((row) => !filters?.marketId || (row.scope.marketIds ?? []).includes(filters.marketId))
            .filter((row) => !filters?.neighborhoodId || (row.scope.neighborhoodIds ?? []).includes(filters.neighborhoodId))
            .filter((row) => !filters?.categoryId || (row.scope.categoryIds ?? []).includes(filters.categoryId));
        return defs.map((row) => ({ ...row, progress: this.getProgressForChallenge(userId, row.id) }));
    }
    getQuestHub(userId, filters) {
        const active = this.listAvailable(userId, filters);
        const weekly = active.filter((row) => row.cadence === "weekly");
        const seasonal = active.filter((row) => row.cadence === "seasonal" || row.cadence === "event");
        const now = Date.now();
        const upcoming = this.store.listDefinitions()
            .filter((row) => row.visibility === "public" && row.status === "scheduled")
            .filter((row) => Date.parse(row.startsAt) > now)
            .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
            .slice(0, 6)
            .map((row) => ({ id: row.id, name: row.name, description: row.description, cadence: row.cadence, startsAt: row.startsAt, endsAt: row.endsAt, eventTheme: row.eventTheme }));
        return {
            generatedAt: new Date(now).toISOString(),
            timezone: "UTC",
            weekly,
            seasonal,
            upcoming
        };
    }
    getSummary(userId) {
        const challenges = this.listAvailable(userId);
        const completed = challenges.filter((item) => item.progress.status === "completed");
        const inProgress = challenges.filter((item) => item.progress.status === "in_progress");
        return {
            totalAvailable: challenges.length,
            completed: completed.length,
            inProgress: inProgress.length,
            weeklyActive: challenges.filter((item) => item.cadence === "weekly").length,
            seasonalActive: challenges.filter((item) => item.cadence !== "weekly").length,
            tracks: {
                explorer: challenges.filter((item) => item.track === "explorer").length,
                creator: challenges.filter((item) => item.track === "creator").length,
                mixed: challenges.filter((item) => item.track === "mixed").length
            },
            featuredLocales: challenges.map((item) => item.neighborhoodLabel ?? item.cityLabel ?? item.marketLabel).filter((item) => Boolean(item)).slice(0, 4)
        };
    }
    getChallengeDetail(userId, challengeId) {
        const definition = this.store.getDefinition(challengeId);
        if (!definition)
            return null;
        return { ...definition, progress: this.getProgressForChallenge(userId, challengeId) };
    }
    upsertDefinition(definition) {
        this.store.upsertDefinition({ ...definition, updatedAt: new Date().toISOString() });
        return definition;
    }
    async recordEvent(event) {
        if (this.store.hasProcessedEvent(event.eventId))
            return { ignored: true, completedChallengeIds: [] };
        this.store.markProcessedEvent(event.eventId);
        if (event.suspicious) {
            await this.trackBlocked(event, "suspicious_event");
            return { ignored: false, completedChallengeIds: [], blockedReason: "suspicious_event" };
        }
        const state = this.store.getUserState(event.userId) ?? defaultState(event.userId);
        const completedChallengeIds = [];
        for (const definition of this.store.listDefinitions()) {
            if (!this.isActive(definition))
                continue;
            const challengeState = state.byChallengeId[definition.id] ?? {
                progressByCriterionId: {},
                canonicalPlaceIdsByCriterionId: {},
                eventCountByDayByCriterionId: {}
            };
            if (challengeState.completedAt)
                continue;
            let changed = false;
            for (const criterion of definition.criteria) {
                if (criterion.eventType !== event.type)
                    continue;
                if (!this.eventMatchesScope(event, criterion.scope ?? definition.scope))
                    continue;
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
                    challengeState.rewardGrantedAt = new Date().toISOString();
                    completedChallengeIds.push(definition.id);
                    await this.emitCompletionSignals(event.userId, definition);
                }
            }
        }
        this.store.saveUserState(state);
        return { ignored: false, completedChallengeIds };
    }
    getProgressForChallenge(userId, challengeId, inMemoryState) {
        const definition = this.store.getDefinition(challengeId);
        if (!definition) {
            return {
                challengeId,
                status: "expired",
                criteria: [],
                qualifyingActions: 0,
                rewardState: "locked",
                window: { startsAt: new Date().toISOString(), endsAt: new Date().toISOString(), secondsRemaining: 0 }
            };
        }
        const state = inMemoryState ?? this.store.getUserState(userId) ?? defaultState(userId);
        const challengeState = state.byChallengeId[challengeId];
        const criteria = definition.criteria.map((criterion) => {
            const current = challengeState?.progressByCriterionId[criterion.id] ?? 0;
            return { criterionId: criterion.id, current, target: criterion.target, remaining: Math.max(criterion.target - current, 0) };
        });
        const qualifyingActions = criteria.reduce((sum, item) => sum + item.current, 0);
        const now = Date.now();
        const expired = Date.parse(definition.endsAt) < now || definition.status === "expired" || definition.status === "retired";
        const completed = criteria.every((item) => item.current >= item.target);
        const rewardState = challengeState?.rewardGrantedAt ? "granted" : completed ? "ready" : "locked";
        return {
            challengeId,
            status: expired ? "expired" : completed ? "completed" : qualifyingActions > 0 ? "in_progress" : "available",
            completedAt: challengeState?.completedAt,
            criteria,
            qualifyingActions,
            rewardState,
            window: {
                startsAt: definition.startsAt,
                endsAt: definition.endsAt,
                secondsRemaining: Math.max(Math.floor((Date.parse(definition.endsAt) - now) / 1000), 0)
            }
        };
    }
    eventMatchesScope(event, scope) {
        if (!scope)
            return true;
        if (scope.marketIds?.length && (!event.marketId || !scope.marketIds.includes(event.marketId)))
            return false;
        if (scope.cityIds?.length && (!event.cityId || !scope.cityIds.includes(event.cityId)))
            return false;
        if (scope.neighborhoodIds?.length && (!event.neighborhoodId || !scope.neighborhoodIds.includes(event.neighborhoodId)))
            return false;
        if (scope.categoryIds?.length && !(event.categoryIds ?? []).some((item) => scope.categoryIds.includes(item)))
            return false;
        if (scope.hotspotIds?.length && !(event.hotspotIds ?? []).some((item) => scope.hotspotIds.includes(item)))
            return false;
        if (scope.canonicalPlaceIds?.length && !scope.canonicalPlaceIds.includes(event.canonicalPlaceId))
            return false;
        return true;
    }
    async emitCompletionSignals(userId, definition) {
        try {
            await this.analyticsService?.track({ type: "challenge_completed", challengeId: definition.id, track: definition.track, scopeType: definition.scopeType, cadence: definition.cadence }, {});
        }
        catch { }
        try {
            if (definition.track === "creator") {
                await this.notifications?.notify({ type: "creator.milestone.reached", recipientUserId: userId, milestoneKey: `challenge:${definition.id}`, milestoneValue: definition.reward.xp + (definition.reward.bonusXp ?? 0) });
            }
            else {
                await this.notifications?.notify({ type: "discovery.local.highlights", recipientUserId: userId, city: definition.cityLabel ?? "your city", highlightsCount: 1 });
            }
        }
        catch { }
    }
    async trackBlocked(event, reason) {
        try {
            await this.analyticsService?.track({ type: "challenge_progress_blocked", reason, challengeEventType: event.type }, {});
        }
        catch { }
    }
}
