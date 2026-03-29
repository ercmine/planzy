import { describe, expect, it } from "vitest";
import { MemoryAnalyticsStore } from "../memoryStore.js";
import { AnalyticsService } from "../service.js";
import { AnalyticsQueryService } from "../queryService.js";
import { validateAnalyticsEvent } from "../validation.js";
describe("analytics foundation", () => {
    it("validates and sanitizes event payload metadata", () => {
        const event = validateAnalyticsEvent({
            eventName: "search_submitted",
            metadata: { searchQueryRaw: "secret", safe: "ok", deep: { nope: true }, email: "hidden" }
        });
        expect(event.eventName).toBe("search_submitted");
        expect(event.metadata).toEqual({ safe: "ok" });
    });
    it("dedupes milestone events and stores canonical records", async () => {
        const analytics = new AnalyticsService(new MemoryAnalyticsStore());
        const batch = [
            { eventName: "video_play_25", mediaId: "m1" },
            { eventName: "video_play_25", mediaId: "m1" },
            { eventName: "video_play_50", mediaId: "m1" }
        ];
        const result = await analytics.ingestBatch({ sessionId: "s1", actorUserId: "u1", platform: "web" }, batch);
        expect(result.accepted).toBe(2);
        expect(result.deduped).toBe(1);
    });
    it("aggregates creator/business/admin summaries", async () => {
        const analytics = new AnalyticsService(new MemoryAnalyticsStore());
        const query = new AnalyticsQueryService(analytics);
        await analytics.ingestBatch({ actorUserId: "u1", creatorId: "creator-1", actorProfileType: "creator", platform: "backend" }, [
            { eventName: "creator_profile_viewed", creatorId: "creator-1" },
            { eventName: "recommendation_impression", creatorId: "creator-1" },
            { eventName: "recommendation_opened", creatorId: "creator-1" }
        ]);
        await analytics.ingestBatch({ actorUserId: "u2", businessId: "biz-1", actorProfileType: "business", platform: "backend" }, [
            { eventName: "business_profile_viewed", businessId: "biz-1" }
        ]);
        const from = new Date(Date.now() - 60_000);
        const to = new Date(Date.now() + 60_000);
        const creatorSummary = await query.creatorOverview("creator-1", from, to);
        const businessSummary = await query.businessOverview("biz-1", from, to);
        const admin = await query.adminOverview(from, to);
        expect(creatorSummary.totalEvents).toBe(3);
        expect(creatorSummary.conversionRate).toBe(1);
        expect(businessSummary.totalEvents).toBe(1);
        expect(admin.totalEvents).toBe(4);
    });
});
