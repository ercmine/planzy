import { describe, expect, it } from "vitest";
import { QuotaManager } from "../router/quotas/quotaManager.js";
describe("QuotaManager", () => {
    it("enforces RPM and allows again after refill", () => {
        let nowMs = 0;
        const manager = new QuotaManager({ now: () => nowMs });
        manager.configure("p1", { requestsPerMinute: 2 });
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        const denied = manager.decide("p1");
        expect(denied.allowed).toBe(false);
        expect(denied.reason).toBe("rpm");
        expect(denied.retryAfterMs).toBe(30_000);
        nowMs += 30_000;
        expect(manager.decide("p1").allowed).toBe(true);
    });
    it("enforces burst capacity separate from sustained RPM", () => {
        let nowMs = 0;
        const manager = new QuotaManager({ now: () => nowMs });
        manager.configure("p1", { requestsPerMinute: 60, burst: 10 });
        for (let i = 0; i < 10; i += 1) {
            expect(manager.decide("p1").allowed).toBe(true);
        }
        const denied = manager.decide("p1");
        expect(denied.allowed).toBe(false);
        expect(denied.reason).toBe("burst");
        expect(denied.retryAfterMs).toBe(1_000);
        nowMs += 1_000;
        expect(manager.decide("p1").allowed).toBe(true);
    });
    it("enforces daily limits and resets on UTC boundary", () => {
        let nowMs = Date.UTC(2026, 0, 1, 23, 59, 0);
        const manager = new QuotaManager({ now: () => nowMs });
        manager.configure("p1", { requestsPerDay: 2 });
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        const denied = manager.decide("p1");
        expect(denied.allowed).toBe(false);
        expect(denied.reason).toBe("rpd");
        expect(denied.retryAfterMs).toBe(60_000);
        nowMs += 61_000;
        expect(manager.decide("p1").allowed).toBe(true);
    });
    it("uses per-request cost against both RPM and RPD", () => {
        let nowMs = 0;
        const manager = new QuotaManager({ now: () => nowMs });
        manager.configure("p1", { requestsPerMinute: 10, requestsPerDay: 10, costPerRequest: 2 });
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        expect(manager.decide("p1").allowed).toBe(true);
        const denied = manager.decide("p1");
        expect(denied.allowed).toBe(false);
        expect(["rpd", "rpm", "burst"]).toContain(denied.reason);
        nowMs += 12_000;
        const stillDailyDenied = manager.decide("p1");
        expect(stillDailyDenied.allowed).toBe(false);
        expect(stillDailyDenied.reason).toBe("rpd");
    });
});
