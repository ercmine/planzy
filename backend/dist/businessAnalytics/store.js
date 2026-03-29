export class MemoryBusinessAnalyticsStore {
    events = new Map();
    daily = new Map();
    async recordEvent(event) {
        if (this.events.has(event.id))
            return;
        this.events.set(event.id, event);
        const date = event.occurredAt.slice(0, 10);
        const key = `${event.businessProfileId}:${event.placeId}:${date}`;
        const row = this.daily.get(key) ?? {
            businessProfileId: event.businessProfileId,
            placeId: event.placeId,
            date,
            views: 0,
            uniqueViewersApprox: 0,
            saves: 0,
            listAdds: 0,
            outboundClicks: 0,
            clicksWebsite: 0,
            clicksPhone: 0,
            clicksBooking: 0,
            clicksMenu: 0,
            clicksDirections: 0,
            reviewCount: 0,
            ratingSum: 0,
            ratingCount: 0,
            reviewResponses: 0,
            creatorExposure: 0,
            creatorClickthrough: 0
        };
        if (event.eventType === "place_view" || event.eventType === "business_profile_view") {
            row.views += 1;
            if (event.sessionId || event.userId)
                row.uniqueViewersApprox += 1;
        }
        if (event.eventType === "place_save")
            row.saves += 1;
        if (event.eventType === "place_list_add")
            row.listAdds += 1;
        if (event.eventType === "outbound_click") {
            row.outboundClicks += 1;
            if (event.outboundTarget === "website")
                row.clicksWebsite += 1;
            if (event.outboundTarget === "phone")
                row.clicksPhone += 1;
            if (event.outboundTarget === "booking")
                row.clicksBooking += 1;
            if (event.outboundTarget === "menu")
                row.clicksMenu += 1;
            if (event.outboundTarget === "directions")
                row.clicksDirections += 1;
        }
        if (event.eventType === "review_created") {
            row.reviewCount += 1;
            if (typeof event.rating === "number") {
                row.ratingSum += event.rating;
                row.ratingCount += 1;
            }
        }
        if (event.eventType === "review_response")
            row.reviewResponses += 1;
        if (event.eventType === "creator_content_exposure")
            row.creatorExposure += 1;
        if (event.eventType === "creator_content_clickthrough")
            row.creatorClickthrough += 1;
        this.daily.set(key, row);
    }
    async listEventsByBusiness(input) {
        const placeSet = new Set(input.placeIds);
        return [...this.events.values()].filter((event) => (event.businessProfileId === input.businessProfileId
            && placeSet.has(event.placeId)
            && event.occurredAt.slice(0, 10) >= input.from
            && event.occurredAt.slice(0, 10) <= input.to));
    }
    async listDailyMetrics(input) {
        const placeSet = new Set(input.placeIds);
        return [...this.daily.values()].filter((row) => (row.businessProfileId === input.businessProfileId
            && placeSet.has(row.placeId)
            && row.date >= input.from
            && row.date <= input.to));
    }
}
