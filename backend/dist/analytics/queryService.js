export class AnalyticsQueryService {
    analytics;
    constructor(analytics) {
        this.analytics = analytics;
    }
    async adminOverview(from, to) {
        return this.summarize({ from, to });
    }
    async creatorOverview(creatorId, from, to) {
        return this.summarize({ from, to, creatorId });
    }
    async businessOverview(businessId, from, to) {
        return this.summarize({ from, to, businessId });
    }
    async summarize(filters) {
        const events = (await this.analytics.listAll()).filter((event) => {
            const ts = new Date(event.occurredAt).getTime();
            if (ts < filters.from.getTime() || ts > filters.to.getTime())
                return false;
            if (filters.creatorId && event.creatorId !== filters.creatorId)
                return false;
            if (filters.businessId && event.businessId !== filters.businessId)
                return false;
            if (filters.actorProfileType && event.actorProfileType !== filters.actorProfileType)
                return false;
            return true;
        });
        const byEventName = {};
        const byCategory = {};
        const users = new Set();
        for (const event of events) {
            byEventName[event.eventName] = (byEventName[event.eventName] ?? 0) + 1;
            byCategory[event.eventCategory] = (byCategory[event.eventCategory] ?? 0) + 1;
            if (event.actorUserId)
                users.add(event.actorUserId);
        }
        const recommendation = byEventName.recommendation_impression ?? 0;
        const recommendationOpen = byEventName.recommendation_opened ?? 0;
        return {
            totalEvents: events.length,
            uniqueActors: users.size,
            byEventName,
            byCategory,
            conversionRate: recommendation > 0 ? recommendationOpen / recommendation : undefined
        };
    }
}
