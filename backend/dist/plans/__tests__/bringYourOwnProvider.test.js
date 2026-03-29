import { describe, expect, it } from "vitest";
import { validatePlanArray } from "../planValidation.js";
import { BringYourOwnProvider } from "../bringYourOwn/bringYourOwnProvider.js";
import { MemoryIdeasStore } from "../bringYourOwn/memoryStorage.js";
describe("BringYourOwnProvider", () => {
    const baseInput = {
        location: { lat: 37.775, lng: -122.418 },
        radiusMeters: 5_000,
        limit: 20
    };
    it("adds an idea and returns it as a plan", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store);
        await store.addIdea("session-1", {
            title: "Sunset picnic",
            description: "Bring snacks and a blanket",
            category: "outdoors"
        });
        const result = await provider.searchPlans(baseInput, { sessionId: "session-1", userId: "user-1" });
        expect(result.source).toBe("byo");
        expect(result.plans).toHaveLength(1);
        expect(result.plans[0]?.title).toBe("Sunset picnic");
        expect(result.plans[0]?.sourceId.startsWith("idea:session-1:")).toBe(true);
        expect(() => validatePlanArray(result.plans)).not.toThrow();
    });
    it("returns empty results when sessionId is missing", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store);
        await store.addIdea("session-1", { title: "Board games" });
        const result = await provider.searchPlans(baseInput);
        expect(result.source).toBe("byo");
        expect(result.plans).toHaveLength(0);
        expect(result.nextCursor).toBeNull();
    });
    it("supports pagination using cursor", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store, { maxIdeasPerSession: 2 });
        await store.addIdea("session-1", { title: "Idea 1" });
        await store.addIdea("session-1", { title: "Idea 2" });
        await store.addIdea("session-1", { title: "Idea 3" });
        const page1 = await provider.searchPlans(baseInput, { sessionId: "session-1" });
        const page2 = await provider.searchPlans({ ...baseInput, cursor: page1.nextCursor ?? null }, { sessionId: "session-1" });
        expect(page1.plans).toHaveLength(2);
        expect(page2.plans).toHaveLength(1);
        expect(page1.plans[0]?.id).not.toBe(page2.plans[0]?.id);
    });
    it("soft delete removes idea from default list", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store);
        const idea = await store.addIdea("session-1", { title: "Laser tag" });
        await store.deleteIdea("session-1", idea.ideaId);
        const result = await provider.searchPlans(baseInput, { sessionId: "session-1" });
        expect(result.plans).toHaveLength(0);
    });
    it("infers category when missing", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store);
        await store.addIdea("session-1", {
            title: "Bowling night",
            description: "Two teams and snacks"
        });
        const result = await provider.searchPlans(baseInput, { sessionId: "session-1" });
        expect(result.plans[0]?.category).toBe("sports");
        expect(() => validatePlanArray(result.plans)).not.toThrow();
    });
    it("normalizes website and phone deep links", async () => {
        const store = new MemoryIdeasStore();
        const provider = new BringYourOwnProvider(store);
        await store.addIdea("session-1", {
            title: "Trivia night",
            website: "notaurl",
            phone: "(415) 555-1234"
        });
        const result = await provider.searchPlans(baseInput, { sessionId: "session-1" });
        const plan = result.plans[0];
        expect(plan?.deepLinks?.websiteLink).toBeUndefined();
        expect(plan?.deepLinks?.callLink).toBe("tel:4155551234");
        expect(() => validatePlanArray(result.plans)).not.toThrow();
    });
});
