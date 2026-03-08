import { describe, expect, it } from "vitest";

import { MemoryAccountsStore } from "../../accounts/memoryStore.js";
import { AccountsService } from "../../accounts/service.js";
import { ProfileType } from "../../accounts/types.js";
import { BusinessAnalyticsService, MemoryBusinessAnalyticsStore } from "../../businessAnalytics/index.js";
import { DevBillingProvider } from "../../subscriptions/billing/provider.js";
import { FeatureQuotaEngine, MemoryAccessUsageStore } from "../../subscriptions/accessEngine.js";
import { SubscriptionService } from "../../subscriptions/service.js";
import { MemoryUsageStore } from "../../subscriptions/usage.js";
import { VenueClaimsService } from "../../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../../venues/claims/memoryStore.js";
import { ValidationError } from "../../plans/errors.js";
import { MemoryCollaborationStore } from "../memoryStore.js";
import { CollaborationService } from "../service.js";
import { BusinessPremiumService, MemoryBusinessPremiumStore } from "../../businessPremium/index.js";
import { MemoryNotificationStore, NotificationService } from "../../notifications/index.js";

async function build() {
  const accounts = new AccountsService(new MemoryAccountsStore());
  const claimStore = new MemoryVenueClaimStore();
  const claims = new VenueClaimsService(claimStore);
  const subscriptions = new SubscriptionService(new MemoryUsageStore(), new DevBillingProvider());
  const access = new FeatureQuotaEngine(subscriptions, new MemoryAccessUsageStore());
  const premium = new BusinessPremiumService(new MemoryBusinessPremiumStore());
  const analytics = new BusinessAnalyticsService(new MemoryBusinessAnalyticsStore(), claimStore, access, premium);
  const notifications = new NotificationService(new MemoryNotificationStore(), () => new Date("2026-03-08T00:00:00.000Z"));
  const service = new CollaborationService(new MemoryCollaborationStore(), accounts, claims, undefined, undefined, analytics, premium, notifications, () => new Date("2026-03-08T00:00:00.000Z"));
  return { accounts, claimStore, service, premium, notifications };
}

describe("collaboration service", () => {
  it("runs invite -> accept -> campaign lifecycle with permissions", async () => {
    const { accounts, claimStore, service, premium, notifications } = await build();
    const businessUser = "biz-1";
    const creatorUser = "creator-1";
    const business = accounts.createBusinessProfile(businessUser, { businessName: "Cafe", slug: "cafe" });
    await premium.setBusinessTier(business.id, "pro");
    const creator = accounts.createCreatorProfile(creatorUser, { creatorName: "Ava" });

    await claimStore.upsertOwnership({
      id: "own-1", placeId: "place-1", businessProfileId: business.id, primaryUserId: businessUser, ownershipRole: "owner", verificationStatus: "verified", verificationLevel: "enhanced", verificationMethodSummary: ["document"], isPrimary: true, isActive: true, approvedAt: "2026-03-08T00:00:00.000Z", createdAt: "2026-03-08T00:00:00.000Z", updatedAt: "2026-03-08T00:00:00.000Z"
    });

    const bizActor = accounts.resolveActingContext(businessUser, { profileType: ProfileType.BUSINESS, profileId: business.id });
    const invite = await service.createInvite(bizActor, {
      businessProfileId: business.id,
      creatorProfileId: creator.id,
      title: "Spring Campaign",
      message: "collab",
      targetPlaceIds: ["place-1"],
      disclosureExpectation: "sponsored",
      highlightedContentPermissionMode: "campaign_opt_in"
    });
    expect(invite.status).toBe("invited");

    const creatorActor = accounts.resolveActingContext(creatorUser, { profileType: ProfileType.CREATOR, profileId: creator.id });
    const accepted = await service.respondToInvite(creatorActor, invite.id, "accept");
    expect(accepted.status).toBe("accepted");

    const list = await service.listBusinessInvites(bizActor, business.id);
    expect(list[0]?.campaignId).toBeTruthy();
    const center = await notifications.list(businessUser);
    expect(center.items.some((x) => x.type === "collaboration_invite_accepted")).toBe(true);
  });

  it("blocks featuring content without creator approval link", async () => {
    const { accounts, claimStore, service, premium } = await build();
    const business = accounts.createBusinessProfile("biz-2", { businessName: "Deli", slug: "deli" });
    const creator = accounts.createCreatorProfile("creator-2", { creatorName: "Noah" });
    await premium.setBusinessTier(business.id, "pro");
    await claimStore.upsertOwnership({ id: "own-2", placeId: "place-2", businessProfileId: business.id, primaryUserId: "biz-2", ownershipRole: "owner", verificationStatus: "verified", verificationLevel: "enhanced", verificationMethodSummary: ["document"], isPrimary: true, isActive: true, approvedAt: "2026-03-08T00:00:00.000Z", createdAt: "2026-03-08T00:00:00.000Z", updatedAt: "2026-03-08T00:00:00.000Z" });
    const bizActor = accounts.resolveActingContext("biz-2", { profileType: ProfileType.BUSINESS, profileId: business.id });
    await expect(service.addFeaturedPlacement(bizActor, {
      businessProfileId: business.id,
      placeId: "place-2",
      creatorProfileId: creator.id,
      contentType: "video_review",
      contentId: "r-1",
      sortOrder: 1,
      approvedByCreator: false,
      disclosureLabel: "sponsored",
      sourceCampaignContentLinkId: "missing"
    })).rejects.toBeInstanceOf(ValidationError);
  });

  it("blocks invite creation for non-premium businesses", async () => {
    const { accounts, claimStore, service, premium } = await build();
    const businessUser = "biz-3";
    const creatorUser = "creator-3";
    const business = accounts.createBusinessProfile(businessUser, { businessName: "Bakery", slug: "bakery" });
    await premium.setBusinessTier(business.id, "standard");
    const creator = accounts.createCreatorProfile(creatorUser, { creatorName: "Luca" });

    await claimStore.upsertOwnership({
      id: "own-3", placeId: "place-3", businessProfileId: business.id, primaryUserId: businessUser, ownershipRole: "owner", verificationStatus: "verified", verificationLevel: "enhanced", verificationMethodSummary: ["document"], isPrimary: true, isActive: true, approvedAt: "2026-03-08T00:00:00.000Z", createdAt: "2026-03-08T00:00:00.000Z", updatedAt: "2026-03-08T00:00:00.000Z"
    });

    const bizActor = accounts.resolveActingContext(businessUser, { profileType: ProfileType.BUSINESS, profileId: business.id });
    await expect(service.createInvite(bizActor, {
      businessProfileId: business.id,
      creatorProfileId: creator.id,
      title: "Standard cannot invite",
      targetPlaceIds: ["place-3"],
      disclosureExpectation: "partnered",
      highlightedContentPermissionMode: "campaign_opt_in"
    })).rejects.toBeInstanceOf(ValidationError);
  });

});
