import { describe, expect, test } from "vitest";
import { DEFAULT_CLAIM_RADIUS_METERS } from "../constants.js";
import { MemoryLocationClaimsStore } from "../memoryStore.js";
import { LocationClaimsService } from "../service.js";
const rpcClient = {
    validateAddress: async () => true,
    sendToAddress: async () => "tx_location_claim_123"
};
function seed(service, depletionThresholdAtomic = 1000n) {
    service.upsertLocation({
        id: "loc_1",
        lat: 30.2672,
        lng: -97.7431,
        displayName: "Congress Ave",
        category: "landmark",
        claimRadiusMeters: DEFAULT_CLAIM_RADIUS_METERS,
        state: "available",
        cooldownSeconds: 3600,
        depletionThresholdAtomic
    });
}
async function claim(service, userId, idempotencyKey) {
    const visit = service.registerVisit({ userId, locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
    const gate = service.prepareAdGate({ userId, locationId: "loc_1", visitId: visit.id });
    service.markAdCompleted(gate.id);
    return await service.finalizeClaim({ userId, locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey, payoutAddress: "PBUG_ADDR_1" });
}
describe("LocationClaimsService", () => {
    test("detects in-range eligibility", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        seed(service);
        const nearby = service.listNearbyClaimables({ userId: "u1", lat: 30.2672, lng: -97.7431 });
        expect(nearby[0]?.inRange).toBe(true);
        expect(nearby[0]?.flowState).toBe("visited");
        expect(nearby[0]?.location.currentReward).toBe("1.0");
    });
    test("requires ad completion before claim finalization", async () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore(), rpcClient);
        seed(service);
        const visit = service.registerVisit({ userId: "u1", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        const gate = service.prepareAdGate({ userId: "u1", locationId: "loc_1", visitId: visit.id });
        await expect(service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "abc", payoutAddress: "PBUG_ADDR_1" })).rejects.toThrow();
        service.markAdCompleted(gate.id);
        const finalized = await service.finalizeClaim({ userId: "u1", locationId: "loc_1", visitId: visit.id, adSessionId: gate.id, idempotencyKey: "abc", payoutAddress: "PBUG_ADDR_1" });
        expect(finalized.rewardIssuedDisplay).toBe("1.0");
        expect(finalized.payoutTxid).toBe("tx_location_claim_123");
    });
    test("applies halving reward progression and claim history", async () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore(), rpcClient);
        seed(service);
        const c1 = await claim(service, "u1", "k1");
        const c2 = await claim(service, "u2", "k2");
        const c3 = await claim(service, "u3", "k3");
        const c4 = await claim(service, "u4", "k4");
        expect(c1.rewardIssuedDisplay).toBe("1.0");
        expect(c2.rewardIssuedDisplay).toBe("0.5");
        expect(c3.rewardIssuedDisplay).toBe("0.25");
        expect(c4.rewardIssuedDisplay).toBe("0.125");
        const location = service.listNearbyClaimables({ userId: "u5", lat: 30.2672, lng: -97.7431 })[0]?.location;
        expect(location?.claimCount).toBe(4);
        expect(location?.totalClaims).toBe(4);
        expect(location?.currentReward).toBe("0.0625");
        expect(location?.totalClaimed).toBe("1.875");
        expect(location?.claimHistory).toHaveLength(4);
    });
    test("tracks visitors separately from successful claims", async () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore(), rpcClient);
        seed(service);
        service.registerVisit({ userId: "viewer", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        service.registerVisit({ userId: "viewer", locationId: "loc_1", lat: 30.2672, lng: -97.7431, accuracyMeters: 10 });
        await claim(service, "claimer", "claim-key");
        const location = service.listNearbyClaimables({ userId: "observer", lat: 30.2672, lng: -97.7431 })[0]?.location;
        expect(location?.uniqueVisitors).toBe(2);
        expect(location?.totalVisitors).toBe(3);
        expect(location?.totalClaims).toBe(1);
    });
    test("enforces yearly cap and rollover with decimal atomic rewards", async () => {
        const store = new MemoryLocationClaimsStore();
        const service = new LocationClaimsService(store, rpcClient);
        const y2025 = service.getPoolStats(2025);
        expect(y2025.startingPool).toBe(10000000n);
        y2025.claimedTotal = 9999500n;
        y2025.available = 500n;
        store.upsertAnnualPool(y2025);
        const y2026 = service.getPoolStats(2026);
        expect(y2026.rolloverFromPrevious).toBe(500n);
        expect(y2026.startingPool).toBe(10000500n);
        y2026.available = 500n;
        store.upsertAnnualPool(y2026);
        seed(service);
        await expect(claim(service, "u1", "pool-low")).rejects.toThrow();
    });
    test("depletes location once next reward drops below minimum threshold", async () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore(), rpcClient);
        seed(service, 125000n);
        await claim(service, "u1", "d1");
        await claim(service, "u2", "d2");
        await claim(service, "u3", "d3");
        const location = service.listNearbyClaimables({ userId: "u9", lat: 30.2672, lng: -97.7431 })[0]?.location;
        expect(location?.isDepleted).toBe(true);
        expect(location?.state).toBe("exhausted");
        expect(location?.currentReward).toBe("0.125");
        await expect(claim(service, "u4", "d4")).rejects.toThrow();
    });
    test("prevents duplicate claims per user per location and supports idempotency", async () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore(), rpcClient);
        seed(service);
        const first = await claim(service, "u1", "same");
        const second = await service.finalizeClaim({
            userId: "u1",
            locationId: "loc_1",
            visitId: first.visitId,
            adSessionId: first.adSessionId,
            idempotencyKey: "same",
            payoutAddress: "PBUG_ADDR_1"
        });
        expect(second.id).toBe(first.id);
        await expect(claim(service, "u1", "new")).rejects.toThrow();
    });
    test("defaults to 500m when claim radius is not provided", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        service.upsertLocation({
            id: "loc_default",
            lat: 30.2672,
            lng: -97.7431,
            displayName: "Default Radius",
            category: "landmark",
            state: "available",
            cooldownSeconds: 3600,
        });
        const nearby = service.listNearbyClaimables({ userId: "u1", lat: 30.2672, lng: -97.7431 });
        expect(nearby[0]?.location.claimRadiusMeters).toBe(DEFAULT_CLAIM_RADIUS_METERS);
        expect(nearby[0]?.inRange).toBe(true);
    });
    test("uses 500m claim radius boundary for in-range and out-of-range checks", () => {
        const service = new LocationClaimsService(new MemoryLocationClaimsStore());
        seed(service);
        const metersToLat = (meters) => meters / 111_139;
        const boundaryLat = 30.2672 + metersToLat(DEFAULT_CLAIM_RADIUS_METERS - 1);
        const outOfRangeLat = 30.2672 + metersToLat(DEFAULT_CLAIM_RADIUS_METERS + 8);
        const boundaryVisit = service.registerVisit({
            userId: "u-boundary",
            locationId: "loc_1",
            lat: boundaryLat,
            lng: -97.7431,
            accuracyMeters: 10,
        });
        expect(boundaryVisit.state).toBe("in_range");
        const farVisit = service.registerVisit({
            userId: "u-far",
            locationId: "loc_1",
            lat: outOfRangeLat,
            lng: -97.7431,
            accuracyMeters: 10,
        });
        expect(farVisit.state).toBe("approaching");
    });
});
