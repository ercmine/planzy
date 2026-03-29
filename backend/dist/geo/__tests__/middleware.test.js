import { describe, expect, it } from "vitest";
import { assertGeoAuth } from "../middleware.js";
describe("assertGeoAuth", () => {
    it("accepts matching secret", () => {
        expect(() => assertGeoAuth({ headers: { "x-dryad-geo-service": "ok" } }, "ok")).not.toThrow();
    });
    it("rejects mismatching secret", () => {
        expect(() => assertGeoAuth({ headers: { "x-dryad-geo-service": "bad" } }, "ok")).toThrow("unauthorized_geo_service_call");
    });
});
