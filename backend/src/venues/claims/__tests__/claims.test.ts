import { describe, expect, it } from "vitest";

import { ValidationError } from "../../../plans/errors.js";
import { VenueClaimsService } from "../claimsService.js";
import { MemoryVenueClaimStore } from "../memoryStore.js";

describe("VenueClaimsService", () => {
  it("supports claim lifecycle, evidence, approval, ownership, and revocation", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore(), () => new Date("2025-01-01T00:00:00.000Z"));

    const draft = await service.createClaimDraft({
      placeId: "place-1",
      claimType: "sole_owner",
      requestedRole: "owner",
      contactEmail: "owner@example.com",
      verificationMethodSelection: ["email_domain", "document"]
    }, { userId: "user-1" });

    expect(draft.status).toBe("draft");

    const submitted = await service.submitClaim(draft.id, { userId: "user-1" });
    expect(submitted.status).toBe("submitted");

    await service.addEvidence(draft.id, { evidenceType: "document", storageRef: "s3://doc" }, { userId: "user-1" });

    const reviewed = await service.reviewClaim(draft.id, "approve", "doc_match", "ok", { userId: "admin-1", isAdmin: true });
    expect(reviewed?.status).toBe("approved");
    expect(reviewed?.verificationLevel).toBe("enhanced");

    const state = await service.getPlaceManagementState("place-1", { userId: "user-1" });
    expect(state.canManage).toBe(true);
    expect(state.ownership).toHaveLength(1);

    await service.revokeOwnership(state.ownership[0]!.id, "ownership_dispute", { userId: "admin-1", isAdmin: true });
    const post = await service.getPlaceManagementState("place-1", { userId: "user-1" });
    expect(post.ownership[0]?.isActive).toBe(false);
  });

  it("blocks unauthorized review", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore());
    const draft = await service.createClaimDraft({
      placeId: "place-2",
      claimType: "sole_owner",
      requestedRole: "owner",
      contactEmail: "owner@example.com"
    }, { userId: "user-2" });

    await service.submitClaim(draft.id, { userId: "user-2" });
    await expect(service.reviewClaim(draft.id, "approve", "x", undefined, { userId: "user-3" })).rejects.toThrowError(ValidationError);
  });

  it("legacy createLead remains available", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore());
    const created = await service.createLead({ venueId: "venue-1", contactEmail: "owner@example.com" }, { userId: "user-1" });
    expect(created.verificationStatus).toBe("pending");
  });
});
