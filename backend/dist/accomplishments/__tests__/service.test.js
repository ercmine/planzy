import { describe, expect, it } from "vitest";
import { MemoryAccomplishmentsStore } from "../memoryStore.js";
import { AccomplishmentsService } from "../service.js";
describe("accomplishments service", () => {
    it("loads badge definitions and unlocks basic explorer badge", async () => {
        const service = new AccomplishmentsService(new MemoryAccomplishmentsStore());
        expect(service.getCatalog().length).toBeGreaterThan(3);
        const result = await service.recordEvent({
            eventId: "evt-r1",
            userId: "u1",
            type: "review_created",
            canonicalPlaceId: "plc-1",
            cityId: "city-1",
            categoryId: "coffee",
            contributionState: "published"
        });
        expect(result.unlocks.some((item) => item.definitionId === "first-footprint")).toBe(true);
    });
    it("supports tiered achievements, collectible completion, trust gating, and anti-spam", async () => {
        const service = new AccomplishmentsService(new MemoryAccomplishmentsStore());
        await service.recordEvent({ eventId: "city-1", userId: "u2", type: "place_explored", cityId: "city-a" });
        await service.recordEvent({ eventId: "city-2", userId: "u2", type: "place_explored", cityId: "city-b" });
        const tierUnlock = await service.recordEvent({ eventId: "city-3", userId: "u2", type: "place_explored", cityId: "city-c" });
        expect(tierUnlock.unlocks.some((item) => item.definitionId === "city-scout" && item.tier === 1)).toBe(true);
        const rejected = await service.recordEvent({
            eventId: "rej-1",
            userId: "u2",
            type: "review_created",
            canonicalPlaceId: "plc-c1",
            cityId: "city-downtown",
            contributionState: "rejected"
        });
        expect(rejected.unlocks).toHaveLength(0);
        await service.recordEvent({ eventId: "col-1", userId: "u2", type: "review_created", canonicalPlaceId: "plc-c1", cityId: "city-downtown", contributionState: "published" });
        await service.recordEvent({ eventId: "col-2", userId: "u2", type: "review_created", canonicalPlaceId: "plc-c2", cityId: "city-downtown", contributionState: "published" });
        const collectible = await service.recordEvent({ eventId: "col-3", userId: "u2", type: "review_created", canonicalPlaceId: "plc-c3", cityId: "city-downtown", contributionState: "published" });
        expect(collectible.unlocks.some((item) => item.definitionId === "coffee-crawl-downtown")).toBe(true);
        const spam = await service.recordEvent({ eventId: "save-1", userId: "u2", type: "place_saved", canonicalPlaceId: "plc-z" });
        const spamDup = await service.recordEvent({ eventId: "save-2", userId: "u2", type: "place_saved", canonicalPlaceId: "plc-z" });
        expect(spam.unlocks).toHaveLength(0);
        expect(spamDup.unlocks).toHaveLength(0);
        const trustedBefore = await service.recordEvent({ eventId: "trust-before", userId: "u2", type: "trust_state_changed", trustedCreator: true, trustScoreDelta: 60 });
        expect(trustedBefore.unlocks.some((item) => item.definitionId === "trusted-creator-mark")).toBe(false);
        await service.recordEvent({ eventId: "helpful-1", userId: "u2", type: "review_helpful", value: 5 });
        const trustedUnlocked = await service.recordEvent({ eventId: "trust-after", userId: "u2", type: "trust_state_changed", trustedCreator: true, trustScoreDelta: 30 });
        expect(trustedUnlocked.unlocks.some((item) => item.definitionId === "trusted-creator-mark")).toBe(true);
        await service.recordEvent({ eventId: "strike-1", userId: "u3", type: "moderation_strike" });
        await service.recordEvent({ eventId: "trust-u3", userId: "u3", type: "trust_state_changed", trustedCreator: true, trustScoreDelta: 120 });
        const blocked = await service.recordEvent({ eventId: "trust-u3-2", userId: "u3", type: "trust_state_changed", trustedCreator: true, trustScoreDelta: 0 });
        expect(blocked.unlocks.some((item) => item.definitionId === "trusted-creator-mark")).toBe(false);
    });
});
