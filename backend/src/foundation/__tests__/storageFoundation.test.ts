import { describe, expect, it } from "vitest";
import { StorageFoundationService } from "../storageFoundation.js";

describe("StorageFoundationService", () => {
  it("looks up plans by stable code", () => {
    const service = new StorageFoundationService();
    const plan = service.getPlanByCode("creator-pro");
    expect(plan?.id).toBe("creator-pro");
  });

  it("supports multiple active roles per user without duplicates", () => {
    const service = new StorageFoundationService();
    service.assignRole({ userId: "u1", roleKey: "USER", status: "ACTIVE", grantSource: "SYSTEM" });
    service.assignRole({ userId: "u1", roleKey: "CREATOR", status: "ACTIVE", grantSource: "SELF_SERVICE" });
    service.assignRole({ userId: "u1", roleKey: "CREATOR", status: "ACTIVE", grantSource: "SELF_SERVICE" });

    expect(service.hasRole("u1", "USER")).toBe(true);
    expect(service.hasRole("u1", "CREATOR")).toBe(true);
  });

  it("enforces unique provider place source links", () => {
    const service = new StorageFoundationService();
    service.linkPlaceSource({ placeId: "p1", provider: "GOOGLE", providerPlaceId: "abc", linkedAt: new Date().toISOString() });
    expect(() => service.linkPlaceSource({ placeId: "p2", provider: "GOOGLE", providerPlaceId: "abc", linkedAt: new Date().toISOString() })).toThrow(/already linked/);
  });

  it("resolves manual entitlement grants ahead of plan defaults", () => {
    const service = new StorageFoundationService();
    service.grantEntitlement({
      principalType: "USER",
      principalId: "u2",
      key: "max_video_reviews_per_month",
      value: 500,
      sourceType: "MANUAL",
      status: "ACTIVE",
      effectiveFrom: new Date(Date.now() - 60_000).toISOString()
    });

    expect(service.resolveEntitlement({ principalType: "USER", principalId: "u2", key: "max_video_reviews_per_month", planCode: "user-free" })).toBe(500);
  });

  it("blocks duplicate active business claims and supports transitions", () => {
    const service = new StorageFoundationService();
    service.createClaim({ id: "c1", placeId: "p1", businessProfileId: "b1", status: "PENDING", submittedAt: new Date().toISOString() });
    expect(() => service.createClaim({ id: "c2", placeId: "p1", businessProfileId: "b1", status: "UNDER_REVIEW", submittedAt: new Date().toISOString() })).toThrow(/active claim/);

    const approved = service.transitionClaim("c1", "APPROVED");
    expect(approved.status).toBe("APPROVED");
  });

  it("persists ordered media attachments across review and place targets", () => {
    const service = new StorageFoundationService();
    service.attachMedia({ mediaAssetId: "m2", targetType: "REVIEW", targetId: "r1", displayOrder: 2 });
    service.attachMedia({ mediaAssetId: "m1", targetType: "REVIEW", targetId: "r1", displayOrder: 1 });
    service.attachMedia({ mediaAssetId: "m3", targetType: "PLACE", targetId: "p9", displayOrder: 1 });

    expect(service.listMediaForTarget("REVIEW", "r1").map((item) => item.mediaAssetId)).toEqual(["m1", "m2"]);
    expect(service.listMediaForTarget("PLACE", "p9")).toHaveLength(1);
  });
});
