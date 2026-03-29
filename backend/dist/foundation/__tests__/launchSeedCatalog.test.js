import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("launch readiness seed catalog", () => {
    it("includes representative launch account, moderation, and ad fixture states", () => {
        const file = resolve(process.cwd(), "db/seeds/launch_readiness.seed.json");
        const json = JSON.parse(readFileSync(file, "utf8"));
        expect(json.users.map((user) => user.id)).toEqual(expect.arrayContaining([
            "user_free_local",
            "user_plus_local",
            "user_trial_local",
            "user_canceled_active",
            "user_past_due",
            "creator_premium",
            "business_owner",
            "admin_mod"
        ]));
        expect(json.users.some((user) => user.roles.includes("MODERATOR"))).toBe(true);
        expect(json.users.some((user) => user.state === "trialing")).toBe(true);
        expect(json.users.some((user) => user.state === "past_due")).toBe(true);
        expect(json.places.some((place) => place.id === "place_media_rich" && place.photoCount >= 20)).toBe(true);
        expect(json.places.some((place) => place.id === "place_sparse" && place.reviewCount <= 2)).toBe(true);
        expect(json.moderationCases.map((item) => item.targetType)).toEqual(expect.arrayContaining([
            "review",
            "review_media",
            "business_review_response"
        ]));
        expect(json.moderationCases.some((item) => item.state === "pending_review")).toBe(true);
        expect(json.moderationCases.some((item) => item.state === "hidden" || item.state === "removed")).toBe(true);
        expect(json.ads.placements).toEqual(expect.arrayContaining(["results", "detail"]));
        expect(json.ads.fallbackCreative).toBeTruthy();
    });
});
