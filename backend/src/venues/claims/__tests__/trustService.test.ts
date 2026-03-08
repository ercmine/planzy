import { describe, expect, it } from "vitest";

import { BusinessTrustService } from "../trustService.js";
import { MemoryVenueClaimStore } from "../memoryStore.js";

describe("BusinessTrustService", () => {
  it("computes claimed + verified contact + completeness badges", async () => {
    const store = new MemoryVenueClaimStore();
    const now = () => new Date("2025-01-01T00:00:00.000Z");
    const service = new BusinessTrustService(store, now);

    await store.upsertOwnership({
      id: "own-1",
      placeId: "place-1",
      primaryUserId: "user-1",
      ownershipRole: "owner",
      verificationStatus: "verified",
      verificationLevel: "enhanced",
      verificationMethodSummary: ["document"],
      isPrimary: true,
      isActive: true,
      approvedAt: now().toISOString(),
      createdAt: now().toISOString(),
      updatedAt: now().toISOString()
    });

    const contact = await service.upsertContactMethod("place-1", { type: "phone", value: "+1 (555) 222-1212" }, { userId: "user-1" });
    await service.setContactVerificationStatus({ placeId: "place-1", contactMethodId: contact.id, status: "verified", method: "admin_manual", actor: { userId: "admin-1", isAdmin: true } });

    const view = await service.buildPublicTrustView("place-1");
    expect(view.isClaimed).toBe(true);
    expect(view.verifiedContactTypes).toContain("phone");
    expect(view.badges.some((entry) => entry.key === "claimed")).toBe(true);
    expect(view.badges.some((entry) => entry.key === "verified_contact")).toBe(true);
  });

  it("revocation removes verified contact signal", async () => {
    const store = new MemoryVenueClaimStore();
    const service = new BusinessTrustService(store, () => new Date("2025-01-01T00:00:00.000Z"));
    const contact = await service.upsertContactMethod("place-2", { type: "email", value: "owner@example.com" }, { userId: "owner-2" });
    await service.setContactVerificationStatus({ placeId: "place-2", contactMethodId: contact.id, status: "verified", method: "admin_manual", actor: { userId: "admin-1", isAdmin: true } });
    await service.setContactVerificationStatus({ placeId: "place-2", contactMethodId: contact.id, status: "revoked", reasonCode: "changed", actor: { userId: "admin-1", isAdmin: true } });

    const view = await service.buildPublicTrustView("place-2");
    expect(view.verifiedContactTypes).toHaveLength(0);
    expect(view.badges.some((entry) => entry.key === "verified_contact")).toBe(false);
  });
});
