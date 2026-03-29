import { describe, expect, it } from "vitest";
import { RetentionPolicy } from "../policy.js";
describe("RetentionPolicy", () => {
    it("clamps router deck cache ttl to configured max", () => {
        const policy = new RetentionPolicy();
        expect(policy.clampTtl("router_deck_cache", 120_000)).toBe(60_000);
        expect(policy.clampTtl("router_deck_cache", 200)).toBe(1_000);
    });
    it("applies provider-specific caps and tmdb is higher than google", () => {
        const policy = new RetentionPolicy();
        expect(policy.clampProviderTtl("google", 2 * 60 * 60 * 1_000)).toBe(60 * 60 * 1_000);
        expect(policy.clampProviderTtl("tmdb", 2 * 60 * 60 * 1_000)).toBe(2 * 60 * 60 * 1_000);
        expect(policy.clampProviderTtl("tmdb", 48 * 60 * 60 * 1_000)).toBe(24 * 60 * 60 * 1_000);
    });
    it("returns requested ttl unchanged when disabled", () => {
        const policy = new RetentionPolicy({ enabled: false });
        expect(policy.clampTtl("router_deck_cache", 999_999_999)).toBe(999_999_999);
        expect(policy.clampProviderTtl("google", 999_999_999)).toBe(999_999_999);
    });
});
