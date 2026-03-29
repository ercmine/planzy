import { describe, expect, it } from "vitest";
import { ProfileType, UserRole } from "../../accounts/types.js";
import { MemoryRolloutStore } from "../store.js";
import { ROLLOUT_FEATURE_KEYS } from "../featureKeys.js";
import { RolloutService } from "../service.js";
describe("rollout service", () => {
    const base = {
        featureKey: ROLLOUT_FEATURE_KEYS.AI_ITINERARY,
        status: "conditional",
        environments: ["production"],
        updatedAt: new Date().toISOString(),
        updatedBy: "test"
    };
    it("enforces environment/cohort/market/account filters and deterministic percentages", () => {
        const svc = new RolloutService(new MemoryRolloutStore([{ ...base, allowCohorts: ["beta"], allowMarkets: ["us"], allowAccountTypes: ["creator"], percentage: 10 }]), undefined, undefined, "production");
        const blocked = svc.evaluate(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, { environment: "production", userId: "u1", market: "ca", cohorts: ["beta"], accountType: "creator", planFamily: undefined, roles: [], activeProfileType: ProfileType.CREATOR });
        expect(blocked.enabled).toBe(false);
        expect(blocked.reason).toBe("market_not_allowed");
        const first = svc.evaluate(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, { environment: "production", userId: "u-sticky", market: "us", cohorts: ["beta"], accountType: "creator", planFamily: undefined, roles: [], activeProfileType: ProfileType.CREATOR });
        const second = svc.evaluate(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, { environment: "production", userId: "u-sticky", market: "us", cohorts: ["beta"], accountType: "creator", planFamily: undefined, roles: [], activeProfileType: ProfileType.CREATOR });
        expect(first.enabled).toBe(second.enabled);
        expect(first.reason).toBe(second.reason);
    });
    it("applies explicit deny ahead of allow and supports internal override", () => {
        const svc = new RolloutService(new MemoryRolloutStore([
            { ...base, denyCohorts: ["beta"], allowCohorts: ["beta"], environments: ["production"] },
            { featureKey: ROLLOUT_FEATURE_KEYS.BUSINESS_COLLABORATION, status: "off", internalOverride: { allowRoles: [UserRole.ADMIN] }, updatedAt: new Date().toISOString(), updatedBy: "test" }
        ]), undefined, undefined, "production");
        const deny = svc.evaluate(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, { environment: "production", userId: "u1", market: "us", cohorts: ["beta"], accountType: "user", planFamily: undefined, roles: [], activeProfileType: ProfileType.PERSONAL });
        expect(deny.reason).toBe("denied_cohort");
        const override = svc.evaluate(ROLLOUT_FEATURE_KEYS.BUSINESS_COLLABORATION, { environment: "production", userId: "admin", market: "us", cohorts: [], accountType: "business", planFamily: undefined, roles: [UserRole.ADMIN], activeProfileType: ProfileType.BUSINESS });
        expect(override.enabled).toBe(true);
    });
    it("defaults unknown features to disabled", () => {
        const svc = new RolloutService(new MemoryRolloutStore([]), undefined, undefined, "production");
        const decision = svc.evaluate("unknown.feature", { environment: "production", cohorts: [], roles: [] });
        expect(decision.enabled).toBe(false);
        expect(decision.reason).toBe("unknown_feature");
    });
});
