import type { CampaignContentLink, CampaignParticipant, CollaborationAuditEvent, CollaborationNotification, CreatorBusinessCampaign, CreatorBusinessInvite, FeaturedCreatorContentPlacement } from "./types.js";
import type { CollaborationStore } from "./store.js";

export class MemoryCollaborationStore implements CollaborationStore {
  private invites = new Map<string, CreatorBusinessInvite>();
  private campaigns = new Map<string, CreatorBusinessCampaign>();
  private participants = new Map<string, CampaignParticipant>();
  private contentLinks = new Map<string, CampaignContentLink>();
  private placements = new Map<string, FeaturedCreatorContentPlacement>();
  private auditEvents: CollaborationAuditEvent[] = [];
  private notifications: CollaborationNotification[] = [];

  async createInvite(invite: CreatorBusinessInvite) { this.invites.set(invite.id, invite); }
  async updateInvite(inviteId: string, patch: Partial<CreatorBusinessInvite>) { const row = this.invites.get(inviteId); if (!row) return null; const next = { ...row, ...patch }; this.invites.set(inviteId, next); return next; }
  async getInvite(inviteId: string) { return this.invites.get(inviteId) ?? null; }
  async listInvitesByBusiness(businessProfileId: string) { return [...this.invites.values()].filter((x) => x.businessProfileId === businessProfileId); }
  async listInvitesByCreator(creatorProfileId: string) { return [...this.invites.values()].filter((x) => x.creatorProfileId === creatorProfileId); }

  async createCampaign(campaign: CreatorBusinessCampaign) { this.campaigns.set(campaign.id, campaign); }
  async updateCampaign(campaignId: string, patch: Partial<CreatorBusinessCampaign>) { const row = this.campaigns.get(campaignId); if (!row) return null; const next = { ...row, ...patch }; this.campaigns.set(campaignId, next); return next; }
  async getCampaign(campaignId: string) { return this.campaigns.get(campaignId) ?? null; }
  async listCampaignsByBusiness(businessProfileId: string) { return [...this.campaigns.values()].filter((x) => x.businessProfileId === businessProfileId); }
  async listCampaignParticipants(campaignId: string) { return [...this.participants.values()].filter((x) => x.campaignId === campaignId); }
  async upsertCampaignParticipant(participant: CampaignParticipant) { this.participants.set(participant.id, participant); }

  async createCampaignContentLink(link: CampaignContentLink) { this.contentLinks.set(link.id, link); }
  async getCampaignContentLink(linkId: string) { return this.contentLinks.get(linkId) ?? null; }
  async updateCampaignContentLink(linkId: string, patch: Partial<CampaignContentLink>) { const row = this.contentLinks.get(linkId); if (!row) return null; const next = { ...row, ...patch }; this.contentLinks.set(linkId, next); return next; }
  async listCampaignContentLinks(campaignId: string) { return [...this.contentLinks.values()].filter((x) => x.campaignId === campaignId); }

  async createFeaturedPlacement(placement: FeaturedCreatorContentPlacement) { this.placements.set(placement.id, placement); }
  async updateFeaturedPlacement(id: string, patch: Partial<FeaturedCreatorContentPlacement>) { const row = this.placements.get(id); if (!row) return null; const next = { ...row, ...patch }; this.placements.set(id, next); return next; }
  async listFeaturedPlacementsForPlace(placeId: string) { return [...this.placements.values()].filter((x) => x.placeId === placeId).sort((a, b) => a.sortOrder - b.sortOrder); }

  async appendAuditEvent(event: CollaborationAuditEvent) { this.auditEvents.push(event); }
  async listAuditEvents(entityType?: CollaborationAuditEvent["entityType"], entityId?: string) { return this.auditEvents.filter((x) => (!entityType || x.entityType === entityType) && (!entityId || x.entityId === entityId)); }

  async createNotification(notification: CollaborationNotification) { this.notifications.push(notification); }
  async listNotificationsByUser(userId: string) { return this.notifications.filter((x) => x.recipientUserId === userId); }
}
