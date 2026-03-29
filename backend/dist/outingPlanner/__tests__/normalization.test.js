import { describe, expect, it } from "vitest";
import { normalizeRequest } from "../normalization.js";
describe("normalizeRequest", () => {
    it("normalizes and clamps planner input", () => {
        const normalized = normalizeRequest({
            prompt: "  Plan a date night  ",
            city: "  Minneapolis ",
            vibeTags: [" Cozy ", "cozy", "Romantic"],
            exclusions: [" NightLife ", "nightlife"],
            durationMinutes: 12,
            partySize: 50
        });
        expect(normalized.prompt).toBe("Plan a date night");
        expect(normalized.city).toBe("Minneapolis");
        expect(normalized.vibeTags).toEqual(["cozy", "romantic"]);
        expect(normalized.exclusions).toEqual(["nightlife"]);
        expect(normalized.durationMinutes).toBe(60);
        expect(normalized.partySize).toBe(20);
    });
});
