import { randomUUID } from "node:crypto";

import type { AccountsService } from "../accounts/service.js";
import { BusinessMembershipRole, CreatorProfileStatus, ProfileType, type ActorContextResolved } from "../accounts/types.js";
import type { BusinessAnalyticsService } from "../businessAnalytics/service.js";
import type { BusinessPremiumService } from "../businessPremium/service.js";
import { ValidationError } from "../plans/errors.js";
import { QUOTA_KEYS, type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import type { CollaborationStore } from "./store.js";
import type { CampaignContentLink, CampaignStatus, CreatorBusinessCampaign, CreatorBusinessInvite, FeaturedCreatorContentPlacement } from "./types.js";

const CAMPAIGN_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["invited", "cancelled", "archived"],
  invited: ["accepted", "declined", "expired", "cancelled", "archived"],
  accepted: ["active", "cancelled", "archived"],
  declined: ["archived"],
  expired: ["archived"],
  active: ["completed", "cancelled", "archived"],
  completed: ["archived"],
  cancelled: ["archived"],
  archived: []
};

export class CollaborationService {
  constructor(
    private readonly store: CollaborationStore,
    private readonly accounts: AccountsService,
    private readonly claims: VenueClaimsService,
    private readonly subscriptions?: SubscriptionService,
    private readonly accessEngine?: FeatureQuotaEngine,
    private readonly businessAnalytics?: BusinessAnalyticsService,
    private readonly businessPremium?: BusinessPremiumService,
    private readonly now: () => Date = () => new Date()
  ) {}

  private assertBusinessManager(actor: ActorContextResolved) {
    if (actor.profileType !== ProfileType.BUSINESS) throw new ValidationError(["business context required"]);
    if (![BusinessMembershipRole.OWNER, BusinessMembershipRole.MANAGER, BusinessMembershipRole.EDITOR].includes(actor.businessMembershipRole as BusinessMembershipRole)) {
      throw new ValidationError(["insufficient business role"]);
    }
  }

  private async assertBusinessCanManagePlaces(actor: ActorContextResolved, businessProfileId: string, placeIds: string[]) {
    this.assertBusinessManager(actor);
    if (actor.profileId !== businessProfileId) throw new ValidationError(["business context mismatch"]);
    for (const placeId of placeIds) {
      await this.claims.getActiveOwnershipForBusinessActor({ placeId, businessProfileId, userId: actor.userId });
    }
  }

  private ensureCreatorContext(actor: ActorContextResolved, creatorProfileId: string) {
    if (actor.profileType !== ProfileType.CREATOR || actor.profileId !== creatorProfileId) throw new ValidationError(["creator context required"]);
    const identity = this.accounts.getIdentitySummary(actor.userId);
    if (!identity.creatorProfile || identity.creatorProfile.id !== creatorProfileId || identity.creatorProfile.status !== CreatorProfileStatus.ACTIVE) {
      throw new ValidationError(["creator profile is not eligible"]);
    }
  }

  async createInvite(actor: ActorContextResolved, input: Omit<CreatorBusinessInvite, "id" | "createdAt" | "updatedAt" | "status" | "createdByUserId">) {
    await this.assertBusinessCanManagePlaces(actor, input.businessProfileId, input.targetPlaceIds);
    if (this.businessPremium && !(await this.businessPremium.canAccessCreatorCollab(input.businessProfileId))) {
      throw new ValidationError(["creator collaboration requires business premium"]);
    }
    const nowIso = this.now().toISOString();

    if (this.subscriptions && this.accessEngine) {
      this.subscriptions.ensureAccount(input.businessProfileId, SubscriptionTargetType.BUSINESS);
      const quota = await this.accessEngine.checkAndConsumeQuota({ targetId: input.businessProfileId, targetType: SubscriptionTargetType.BUSINESS }, QUOTA_KEYS.BUSINESS_CAMPAIGNS_PER_MONTH, 1);
      if (!quota.allowed) throw new ValidationError(["invite limit reached for current plan"]);
    }

    const invite: CreatorBusinessInvite = { ...input, id: randomUUID(), createdByUserId: actor.userId, status: "invited", createdAt: nowIso, updatedAt: nowIso };
    await this.store.createInvite(invite);
    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "invite", entityId: invite.id, action: "created", actorUserId: actor.userId, businessProfileId: invite.businessProfileId, creatorProfileId: invite.creatorProfileId, createdAt: nowIso });
    await this.store.createNotification({ id: randomUUID(), recipientUserId: invite.creatorProfileId, type: "invite_created", payload: { inviteId: invite.id, businessProfileId: invite.businessProfileId }, createdAt: nowIso });
    return invite;
  }

  async listBusinessInvites(actor: ActorContextResolved, businessProfileId: string) { this.assertBusinessManager(actor); if (actor.profileId !== businessProfileId) throw new ValidationError(["business context mismatch"]); return this.store.listInvitesByBusiness(businessProfileId); }
  async listCreatorInvites(actor: ActorContextResolved, creatorProfileId: string) { this.ensureCreatorContext(actor, creatorProfileId); return this.store.listInvitesByCreator(creatorProfileId); }

  async respondToInvite(actor: ActorContextResolved, inviteId: string, decision: "accept" | "decline", note?: string) {
    const invite = await this.store.getInvite(inviteId);
    if (!invite) throw new ValidationError(["invite not found"]);
    this.ensureCreatorContext(actor, invite.creatorProfileId);
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < this.now().getTime()) throw new ValidationError(["invite expired"]);
    if (invite.status !== "invited") throw new ValidationError(["invite is not actionable"]);

    const nextStatus = decision === "accept" ? "accepted" : "declined";
    const nowIso = this.now().toISOString();
    const updated = await this.store.updateInvite(invite.id, { status: nextStatus, responseNote: note, respondedAt: nowIso, updatedAt: nowIso });
    if (!updated) throw new ValidationError(["invite not found"]);

    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "invite", entityId: invite.id, action: nextStatus, actorUserId: actor.userId, businessProfileId: invite.businessProfileId, creatorProfileId: invite.creatorProfileId, createdAt: nowIso });
    await this.store.createNotification({ id: randomUUID(), recipientUserId: invite.createdByUserId, type: nextStatus === "accepted" ? "invite_accepted" : "invite_declined", payload: { inviteId: invite.id }, createdAt: nowIso });

    if (nextStatus === "accepted") {
      const businessActor = this.accounts.resolveActingContext(invite.createdByUserId, { profileType: ProfileType.BUSINESS, profileId: invite.businessProfileId });
      const campaign = await this.createCampaign(businessActor, {
        businessProfileId: invite.businessProfileId,
        title: invite.title,
        description: invite.message,
        status: "active",
        startAt: invite.proposedStartAt,
        endAt: invite.proposedEndAt,
        createdFromInviteId: invite.id,
        campaignType: "single_creator",
        visibility: "private",
        collaborationTermsVersion: "v1"
      }, invite.targetPlaceIds);
      await this.store.updateInvite(invite.id, { campaignId: campaign.id, updatedAt: this.now().toISOString() });
    }

    return updated;
  }

  async createCampaign(actor: ActorContextResolved, input: Omit<CreatorBusinessCampaign, "id" | "createdAt" | "updatedAt" | "createdByUserId">, placeIds: string[]) {
    await this.assertBusinessCanManagePlaces(actor, input.businessProfileId, placeIds);
    if (this.businessPremium && !(await this.businessPremium.canRunBusinessCampaigns(input.businessProfileId))) {
      throw new ValidationError(["campaign controls require business premium"]);
    }
    const nowIso = this.now().toISOString();
    const campaign: CreatorBusinessCampaign = { ...input, id: randomUUID(), createdByUserId: actor.userId, createdAt: nowIso, updatedAt: nowIso };
    await this.store.createCampaign(campaign);
    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "campaign", entityId: campaign.id, action: "created", actorUserId: actor.userId, businessProfileId: campaign.businessProfileId, createdAt: nowIso });
    return campaign;
  }

  async transitionCampaignStatus(actor: ActorContextResolved, campaignId: string, nextStatus: CampaignStatus) {
    const campaign = await this.store.getCampaign(campaignId);
    if (!campaign) throw new ValidationError(["campaign not found"]);
    this.assertBusinessManager(actor);
    if (actor.profileId !== campaign.businessProfileId) throw new ValidationError(["business context mismatch"]);
    if (!CAMPAIGN_TRANSITIONS[campaign.status].includes(nextStatus)) throw new ValidationError([`illegal status transition ${campaign.status} -> ${nextStatus}`]);
    const nowIso = this.now().toISOString();
    const updated = await this.store.updateCampaign(campaignId, { status: nextStatus, updatedAt: nowIso, archivedAt: nextStatus === "archived" ? nowIso : undefined });
    if (!updated) throw new ValidationError(["campaign not found"]);
    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "campaign", entityId: campaignId, action: `status_changed:${nextStatus}`, actorUserId: actor.userId, businessProfileId: campaign.businessProfileId, createdAt: nowIso });
    return updated;
  }

  async linkContentToCampaign(actor: ActorContextResolved, input: Omit<CampaignContentLink, "id" | "createdAt" | "updatedAt" | "moderationStatus">) {
    const campaign = await this.store.getCampaign(input.campaignId);
    if (!campaign) throw new ValidationError(["campaign not found"]);
    this.ensureCreatorContext(actor, input.creatorProfileId);
    const nowIso = this.now().toISOString();
    const link: CampaignContentLink = { ...input, id: randomUUID(), moderationStatus: "approved", createdAt: nowIso, updatedAt: nowIso };
    await this.store.createCampaignContentLink(link);
    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "content_link", entityId: link.id, action: "created", actorUserId: actor.userId, businessProfileId: campaign.businessProfileId, creatorProfileId: link.creatorProfileId, createdAt: nowIso });
    return link;
  }

  async addFeaturedPlacement(actor: ActorContextResolved, input: Omit<FeaturedCreatorContentPlacement, "id" | "createdAt" | "updatedAt" | "isActive">) {
    await this.assertBusinessCanManagePlaces(actor, input.businessProfileId, [input.placeId]);
    const link = input.sourceCampaignContentLinkId ? await this.store.getCampaignContentLink(input.sourceCampaignContentLinkId) : null;
    if (input.sourceCampaignContentLinkId && (!link || link.contentId !== input.contentId || !link.creatorApprovedForFeaturing || link.moderationStatus !== "approved")) {
      throw new ValidationError(["creator permission missing for featured placement"]);
    }
    const nowIso = this.now().toISOString();
    const placement: FeaturedCreatorContentPlacement = { ...input, isActive: true, id: randomUUID(), createdAt: nowIso, updatedAt: nowIso };
    await this.store.createFeaturedPlacement(placement);
    await this.store.appendAuditEvent({ id: randomUUID(), entityType: "featured_content", entityId: placement.id, action: "created", actorUserId: actor.userId, businessProfileId: placement.businessProfileId, creatorProfileId: placement.creatorProfileId, createdAt: nowIso });
    if (this.businessAnalytics) {
      await this.businessAnalytics.recordEvent({ eventType: "creator_content_exposure", placeId: placement.placeId, businessProfileId: placement.businessProfileId, creatorProfileId: placement.creatorProfileId, contentId: placement.contentId, occurredAt: nowIso, sourceSurface: "featured_creator_content" });
    }
    return placement;
  }

  async listFeaturedForPlace(placeId: string) {
    const rows = await this.store.listFeaturedPlacementsForPlace(placeId);
    return rows.filter((x) => x.isActive);
  }

  async listMyNotifications(actor: ActorContextResolved) { return this.store.listNotificationsByUser(actor.profileId); }
}
