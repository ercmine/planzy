import { describe, expect, it } from "vitest";
import { ClickTracker } from "../../analytics/clicks/clickTracker.js";
import { MemoryClickStore } from "../../analytics/clicks/memoryStore.js";
import { MemoryTelemetryStore } from "../memoryStore.js";
import { TelemetryService } from "../telemetryService.js";
describe("TelemetryService", () => {
    it("ingests supported events and forwards outbound_link_clicked to ClickTracker", async () => {
        const clickStore = new MemoryClickStore();
        const clickTracker = new ClickTracker(clickStore, { now: () => new Date("2025-02-03T04:05:06.000Z") });
        const telemetryStore = new MemoryTelemetryStore();
        const service = new TelemetryService(telemetryStore, {
            now: () => new Date("2025-02-03T04:05:06.000Z"),
            clickTracker
        });
        const events = [
            { event: "deck_loaded", sessionId: "ignored", batchSize: 10, returned: 10, nextCursorPresent: true },
            { event: "card_viewed", sessionId: "s1", planId: "p1", viewMs: 1234 },
            { event: "swipe", sessionId: "s1", planId: "p1", action: "yes" },
            { event: "card_opened", sessionId: "s1", planId: "p1", section: "links" },
            { event: "outbound_link_clicked", sessionId: "s1", planId: "p1", linkType: "website", affiliate: true }
        ];
        const result = await service.ingestBatch("s1", events, { userId: "user-1", requestId: "req-1" });
        expect(result.accepted).toBe(5);
        expect(result.rejected).toBe(0);
        const listed = await service.list("s1");
        expect(listed.items).toHaveLength(5);
        const clicks = await clickTracker.list("s1");
        expect(clicks.clicks).toHaveLength(1);
        expect(clicks.clicks[0]?.linkType).toBe("website");
        expect(clicks.clicks[0]?.meta?.source).toBe("telemetry");
    });
    it("rejects events with pii-like url fields while accepting valid ones", async () => {
        const service = new TelemetryService(new MemoryTelemetryStore());
        const result = await service.ingestBatch("s1", [
            { event: "swipe", sessionId: "s1", planId: "p1", action: "no", url: "https://unsafe.example" },
            { event: "swipe", sessionId: "s1", planId: "p2", action: "maybe" }
        ]);
        expect(result.accepted).toBe(1);
        expect(result.rejected).toBe(1);
        expect(result.errors?.[0]?.index).toBe(0);
        expect(result.errors?.[0]?.reason).toContain("PII-unsafe");
    });
    it("aggregates counts and swipe breakdown", async () => {
        const service = new TelemetryService(new MemoryTelemetryStore());
        await service.ingestBatch("s1", [
            { event: "deck_loaded", sessionId: "s1", batchSize: 3, returned: 3, nextCursorPresent: false },
            { event: "swipe", sessionId: "s1", planId: "p1", action: "yes" },
            { event: "swipe", sessionId: "s1", planId: "p2", action: "no" },
            { event: "swipe", sessionId: "s1", planId: "p3", action: "maybe" },
            { event: "outbound_link_clicked", sessionId: "s1", planId: "p3", linkType: "maps" }
        ]);
        const aggregate = await service.aggregate("s1");
        expect(aggregate.countsByEvent.deck_loaded).toBe(1);
        expect(aggregate.countsByEvent.swipe).toBe(3);
        expect(aggregate.countsByEvent.outbound_link_clicked).toBe(1);
        expect(aggregate.swipes).toEqual({ yes: 1, no: 1, maybe: 1 });
        expect(aggregate.outboundByLinkType.maps).toBe(1);
    });
});
