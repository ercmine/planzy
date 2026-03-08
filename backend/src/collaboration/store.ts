import type { CampaignContentLink, CampaignParticipant, CollaborationAuditEvent, CollaborationNotification, CreatorBusinessCampaign, CreatorBusinessInvite, FeaturedCreatorContentPlacement } from "./types.js";

export interface CollaborationStore {
  createInvite(invite: CreatorBusinessInvite): Promise<void>;
  updateInvite(inviteId: string, patch: Partial<CreatorBusinessInvite>): Promise<CreatorBusinessInvite | null>;
  getInvite(inviteId: string): Promise<CreatorBusinessInvite | null>;
  listInvitesByBusiness(businessProfileId: string): Promise<CreatorBusinessInvite[]>;
  listInvitesByCreator(creatorProfileId: string): Promise<CreatorBusinessInvite[]>;

  createCampaign(campaign: CreatorBusinessCampaign): Promise<void>;
  updateCampaign(campaignId: string, patch: Partial<CreatorBusinessCampaign>): Promise<CreatorBusinessCampaign | null>;
  getCampaign(campaignId: string): Promise<CreatorBusinessCampaign | null>;
  listCampaignsByBusiness(businessProfileId: string): Promise<CreatorBusinessCampaign[]>;
  listCampaignParticipants(campaignId: string): Promise<CampaignParticipant[]>;
  upsertCampaignParticipant(participant: CampaignParticipant): Promise<void>;

  createCampaignContentLink(link: CampaignContentLink): Promise<void>;
  getCampaignContentLink(linkId: string): Promise<CampaignContentLink | null>;
  updateCampaignContentLink(linkId: string, patch: Partial<CampaignContentLink>): Promise<CampaignContentLink | null>;
  listCampaignContentLinks(campaignId: string): Promise<CampaignContentLink[]>;

  createFeaturedPlacement(placement: FeaturedCreatorContentPlacement): Promise<void>;
  updateFeaturedPlacement(id: string, patch: Partial<FeaturedCreatorContentPlacement>): Promise<FeaturedCreatorContentPlacement | null>;
  listFeaturedPlacementsForPlace(placeId: string): Promise<FeaturedCreatorContentPlacement[]>;

  appendAuditEvent(event: CollaborationAuditEvent): Promise<void>;
  listAuditEvents(entityType?: CollaborationAuditEvent["entityType"], entityId?: string): Promise<CollaborationAuditEvent[]>;

  createNotification(notification: CollaborationNotification): Promise<void>;
  listNotificationsByUser(userId: string): Promise<CollaborationNotification[]>;
}
