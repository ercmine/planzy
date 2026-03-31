import { describe, expect, test } from "vitest";
import { MemoryLocationClaimsStore } from "../memoryStore.js";
import { LocationClaimsService } from "../service.js";
function seed(service) {
    service.upsertLocation({
        id: "loc_1",
        lat: 30.2672,
        lng: -97.7431,
        displayName: "Congress Ave",
        category: "landmark",
        claimRadiusMeters: 120,
        rewardPerClaim: 100,
        state: "available",
        cooldownSeconds: 3600
    });
}
describe("LocationClaimsService", () => {
    test("detects in-range eligibility", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        seed(service);
        const nearby = service.listNearbyClaimables({ userId: "u1", lat: 30.2672, lng: -97.7431 });
        expect(nearby[0]?.inRange).toBe(true);
        expect(nearby[0]?.flowState).toBe("visited");
    });
    test("requires ad completion before claim finalization", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        seed(service);
        const visit = service.registerVisit({ userId: "u1", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        const gate = service.prepareAdGate({ userId: "u1", locationId: "loc_1", visitId: visit.id });
        expect(() => service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "abc" })).toThrow();
        service.markAdCompleted(gate.id);
        const claim = service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "abc" });
        expect(claim.rewardIssued).toBe(100n);
    });
    test("enforces yearly cap and rollover", () => {
        const store = new MemoryLocationClaimsStore();
        const service = new LocationClaimsService(store);
        const y2025 = service.getPoolStats(2025);
        expect(y2025.startingPool).toBe(10000000n);
        // simulate partial year usage
        y2025.claimedTotal = 9999900n;
        y2025.available = 100n;
        store.upsertAnnualPool(y2025);
        const y2026 = service.getPoolStats(2026);
        expect(y2026.rolloverFromPrevious).toBe(100n);
        expect(y2026.startingPool).toBe(10000100n);
    });
    test("prevents duplicate claims per user per location and supports idempotency", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        seed(service);
        const visit = service.registerVisit({ userId: "u1", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        const gate = service.prepareAdGate({ userId: "u1", locationId: "loc_1", visitId: visit.id });
        service.markAdCompleted(gate.id);
        const first = service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "same" });
        const second = service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "same" });
        expect(second.id).toBe(first.id);
        const revisit = service.registerVisit({ userId: "u1", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        const gate2 = service.prepareAdGate({ userId: "u1", locationId: "loc_1", visitId: revisit.id });
        service.markAdCompleted(gate2.id);
        expect(() => service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: revisit.id, adSessionId: gate2.id, idempotencyKey: "new" })).toThrow();
    });
});
