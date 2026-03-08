import { describe, expect, it } from "vitest";

import { CreatorProfileStatus, ProfileVisibility, VerificationStatus, type CreatorProfile } from "../../accounts/types.js";
import { MemoryCreatorVerificationStore } from "../memoryStore.js";
import { CreatorVerificationService, getCreatorVerificationBadge } from "../service.js";

function deps(seed?: { moderationFlags?: string[]; createdAt?: string; creatorPatch?: Partial<CreatorProfile> }) {
  const creator: CreatorProfile = {
    id: "cp_1",
    userId: "u1",
    creatorName: "Creator",
    displayName: "Creator",
    slug: "creator",
    handle: "creator",
    bio: "bio",
    avatarUrl: "https://img.test/a.png",
    websiteUrl: undefined,
    category: "food",
    tags: [],
    socialLinks: [],
    followerCount: 10,
    followingCount: 0,
    publicReviewsCount: 2,
    publicGuidesCount: 1,
    badges: [],
    status: CreatorProfileStatus.ACTIVE,
    isPublic: true,
    verificationStatus: VerificationStatus.UNVERIFIED,
    visibility: ProfileVisibility.PUBLIC,
    createdAt: seed?.createdAt ?? new Date(Date.now() - 30 * 86_400_000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...seed?.creatorPatch
  };
  return {
    creator,
    service: new CreatorVerificationService(new MemoryCreatorVerificationStore(), {
      getCreatorProfileByUserId: (userId) => (userId === "u1" ? creator : undefined),
      getCreatorProfileById: (id) => (id === creator.id ? creator : undefined),
      updateCreatorProfile: (profile) => Object.assign(creator, profile),
      getUser: (userId) => userId === "u1" ? { createdAt: creator.createdAt, moderationFlags: seed?.moderationFlags ?? [] } : undefined
    })
  };
}

describe("creator verification service", () => {
  it("evaluates eligibility and blocks missing creator profile", () => {
    const service = new CreatorVerificationService(new MemoryCreatorVerificationStore(), {
      getCreatorProfileByUserId: () => undefined,
      getCreatorProfileById: () => undefined,
      updateCreatorProfile: () => undefined,
      getUser: () => undefined
    });
    const result = service.getEligibilityForUser("u-missing");
    expect(result.eligible).toBe(false);
    expect(result.failedChecks.some((item) => item.code === "creator_profile_required")).toBe(true);
  });

  it("submits, approves, rejects, and revokes with badge state changes", () => {
    const { service, creator } = deps();
    service.saveDraft("u1", { reason: "I post local guides", portfolioLinks: ["https://site.test/portfolio"], socialLinks: ["https://instagram.com/creator"] });
    const submitted = service.submit("u1");
    expect(submitted.status).toBe("submitted");

    const underReview = service.transitionToUnderReview("admin-1", submitted.id);
    expect(underReview.status).toBe("under_review");

    const approved = service.approve("admin-1", submitted.id, "looks legitimate");
    expect(approved.status).toBe("approved");
    expect(creator.badges).toContain("verified_creator");

    const revoked = service.revoke("admin-1", creator.id, "policy_violation", "Verification revoked.");
    expect(revoked.status).toBe("revoked");
    expect(creator.badges).not.toContain("verified_creator");

    const { service: service2 } = deps();
    service2.saveDraft("u1", { reason: "updated evidence" });
    const resubmitted = service2.submit("u1");
    const rejected = service2.reject("admin-1", resubmitted.id, "insufficient_creator_activity", "Not approved now.");
    expect(rejected.status).toBe("rejected");
    expect(rejected.reapplyEligibleAt).toBeTruthy();
  });

  it("prevents duplicate active submissions and checks badge helper", () => {
    const { service } = deps();
    service.saveDraft("u1", { reason: "r" });
    const submitted = service.submit("u1");
    expect(() => service.saveDraft("u1", { reason: "again" })).toThrowError("ACTIVE_APPLICATION_EXISTS");
    expect(getCreatorVerificationBadge(submitted.status).isVerified).toBe(false);
    expect(getCreatorVerificationBadge("approved", new Date().toISOString()).isVerified).toBe(true);
  });

  it("blocks submission for moderation-flagged creators", () => {
    const { service } = deps({ moderationFlags: ["severe_recent_violation"] });
    service.saveDraft("u1", { reason: "r" });
    expect(() => service.submit("u1")).toThrowError(/recent_moderation_issue/);
  });
});
