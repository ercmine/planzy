import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("foundation seed catalog", () => {
    it("contains stable baseline plan, role, and entitlement keys", () => {
        const file = resolve(process.cwd(), "db/seeds/foundation_catalog.seed.json");
        const json = JSON.parse(readFileSync(file, "utf8"));
        expect(json.plans.map((p) => p.code)).toEqual(expect.arrayContaining(["user-free", "creator-pro", "business-elite"]));
        expect(json.roles.map((r) => r.roleKey)).toEqual(expect.arrayContaining(["USER", "CREATOR", "BUSINESS_OWNER", "ADMIN"]));
        expect(json.entitlements).toEqual(expect.arrayContaining(["ads_enabled", "business_claiming_enabled", "creator_profile_enabled"]));
    });
});
