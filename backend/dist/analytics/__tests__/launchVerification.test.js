import { describe, expect, it } from "vitest";
import { MemoryAnalyticsStore } from "../memoryStore.js";
import { AnalyticsService } from "../service.js";
describe("launch analytics verification", () => {
    it("captures a coherent discovery + subscription + ads funnel with required context", async () => {
        const service = new AnalyticsService(new MemoryAnalyticsStore());
        const result = await service.ingestBatch({
            actorUserId: "user-1",
            sessionId: "sess-1",
            platform: "web",
            sourceRoute: "/discover",
            environment: "staging"
        }, [
            { eventName: "app_session_started" },
            { eventName: "search_submitted", metadata: { queryIntent: "sushi" } },
            { eventName: "search_results_viewed", metadata: { resultCount: 12 } },
            { eventName: "place_card_opened", placeId: "place_media_rich" },
            { eventName: "place_media_gallery_viewed", placeId: "place_media_rich" },
            { eventName: "review_submitted", placeId: "place_media_rich", reviewId: "review-1" },
            { eventName: "paywall_viewed", metadata: { surface: "planner" } },
            { eventName: "upgrade_cta_clicked", metadata: { surface: "planner" } },
            { eventName: "subscription_purchased", subscriptionId: "sub-1", success: true },
            { eventName: "entitlement_unlocked", subscriptionId: "sub-1", metadata: { planCode: "user-pro" } },
            { eventName: "ad_suppressed_by_entitlement", adPlacementId: "results-slot-1" }
        ]);
        expect(result.accepted).toBe(11);
        expect(result.rejected).toBe(0);
        const all = await service.listAll();
        expect(all.every((event) => event.sessionId === "sess-1")).toBe(true);
        expect(all.some((event) => event.eventName === "subscription_purchased" && event.subscriptionId === "sub-1")).toBe(true);
        expect(all.some((event) => event.eventName === "ad_suppressed_by_entitlement")).toBe(true);
    });
    it("dedupes impression milestones to avoid double counting", async () => {
        const service = new AnalyticsService(new MemoryAnalyticsStore());
        const result = await service.ingestBatch({ actorUserId: "user-2", sessionId: "sess-2", platform: "ios" }, [
            { eventName: "place_card_impression", placeId: "p1" },
            { eventName: "place_card_impression", placeId: "p1" },
            { eventName: "place_card_impression", placeId: "p2" }
        ]);
        expect(result.accepted).toBe(2);
        expect(result.deduped).toBe(1);
    });
});
