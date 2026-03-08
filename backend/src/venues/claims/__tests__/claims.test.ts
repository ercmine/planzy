import { describe, expect, it } from "vitest";

import { ValidationError } from "../../../plans/errors.js";
import { VenueClaimsService } from "../claimsService.js";
import { MemoryVenueClaimStore } from "../memoryStore.js";

async function createApprovedOwnership(service: VenueClaimsService, placeId = "place-1", userId = "user-1") {
  const draft = await service.createClaimDraft({
    placeId,
    claimType: "sole_owner",
    requestedRole: "owner",
    contactEmail: "owner@example.com",
    verificationMethodSelection: ["email_domain", "document"]
  }, { userId });
  await service.submitClaim(draft.id, { userId });
  await service.addEvidence(draft.id, { evidenceType: "document", storageRef: "s3://doc" }, { userId });
  await service.reviewClaim(draft.id, "approve", "doc_match", "ok", { userId: "admin-1", isAdmin: true });
}

describe("VenueClaimsService", () => {
  it("supports claim lifecycle, evidence, approval, ownership, and revocation", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore(), () => new Date("2025-01-01T00:00:00.000Z"));

    await createApprovedOwnership(service);

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

  it("supports official business profile management fields with source-aware projection", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore(), () => new Date("2025-01-01T00:00:00.000Z"));
    await createApprovedOwnership(service, "place-3", "owner-3");

    const description = await service.updateOfficialDescription("place-3", "<b>Official and fresh</b> description", { userId: "owner-3" });
    expect(description.content).toContain("Official and fresh");

    const category = await service.submitCategorySuggestion("place-3", { primaryCategoryId: "restaurant", secondaryCategoryIds: ["brunch"], reason: "accurate" }, { userId: "owner-3" });
    expect(category.status).toBe("pending");

    const hours = await service.updateManagedHours("place-3", {
      timezone: "America/New_York",
      weeklyHours: { monday: [{ opens: "09:00", closes: "17:00" }] },
      specialHours: [],
      moderationStatus: "approved",
      effectiveStatus: "active"
    }, { userId: "owner-3" });
    expect(hours.timezone).toBe("America/New_York");

    const website = await service.upsertBusinessLink("place-3", { linkType: "website", value: "https://example.com/" }, { userId: "owner-3" });
    expect(website.url).toBe("https://example.com/");

    await service.upsertBusinessImage("place-3", {
      mediaAssetId: "asset-1",
      imageType: "interior",
      sortOrder: 0,
      isCover: true,
      isActive: true
    }, { userId: "owner-3" });

    await service.upsertMenuServices("place-3", { contentType: "menu", externalUrl: "https://example.com/menu" }, { userId: "owner-3" });

    const projection = await service.buildPublicPlaceProjection("place-3", {
      longDescription: "old provider description",
      websiteUrl: "https://old-provider.example.com",
      normalizedHours: { monday: [{ opens: "10:00", closes: "18:00" }] },
      providerCategories: ["food"],
      photoGallery: [{ canonicalPhotoId: "provider-1" }]
    });

    expect(projection.merged.description.source).toBe("official_business");
    expect(projection.merged.website.source).toBe("official_business");
    expect(projection.merged.images.officialCover).toBe("asset-1");
  });

  it("blocks unverified users from managing official profile", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore());
    await expect(service.updateOfficialDescription("place-99", "No access", { userId: "user-99" })).rejects.toThrowError(ValidationError);
  });

  it("legacy createLead remains available", async () => {
    const service = new VenueClaimsService(new MemoryVenueClaimStore());
    const created = await service.createLead({ venueId: "venue-1", contactEmail: "owner@example.com" }, { userId: "user-1" });
    expect(created.verificationStatus).toBe("pending");
  });
});
