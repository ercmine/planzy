export class MemoryCollaborationStore {
    invites = new Map();
    campaigns = new Map();
    participants = new Map();
    contentLinks = new Map();
    placements = new Map();
    auditEvents = [];
    async createInvite(invite) { this.invites.set(invite.id, invite); }
    async updateInvite(inviteId, patch) { const row = this.invites.get(inviteId); if (!row)
        return null; const next = { ...row, ...patch }; this.invites.set(inviteId, next); return next; }
    async getInvite(inviteId) { return this.invites.get(inviteId) ?? null; }
    async listInvitesByBusiness(businessProfileId) { return [...this.invites.values()].filter((x) => x.businessProfileId === businessProfileId); }
    async listInvitesByCreator(creatorProfileId) { return [...this.invites.values()].filter((x) => x.creatorProfileId === creatorProfileId); }
    async createCampaign(campaign) { this.campaigns.set(campaign.id, campaign); }
    async updateCampaign(campaignId, patch) { const row = this.campaigns.get(campaignId); if (!row)
        return null; const next = { ...row, ...patch }; this.campaigns.set(campaignId, next); return next; }
    async getCampaign(campaignId) { return this.campaigns.get(campaignId) ?? null; }
    async listCampaignsByBusiness(businessProfileId) { return [...this.campaigns.values()].filter((x) => x.businessProfileId === businessProfileId); }
    async listCampaignParticipants(campaignId) { return [...this.participants.values()].filter((x) => x.campaignId === campaignId); }
    async upsertCampaignParticipant(participant) { this.participants.set(participant.id, participant); }
    async createCampaignContentLink(link) { this.contentLinks.set(link.id, link); }
    async getCampaignContentLink(linkId) { return this.contentLinks.get(linkId) ?? null; }
    async updateCampaignContentLink(linkId, patch) { const row = this.contentLinks.get(linkId); if (!row)
        return null; const next = { ...row, ...patch }; this.contentLinks.set(linkId, next); return next; }
    async listCampaignContentLinks(campaignId) { return [...this.contentLinks.values()].filter((x) => x.campaignId === campaignId); }
    async createFeaturedPlacement(placement) { this.placements.set(placement.id, placement); }
    async updateFeaturedPlacement(id, patch) { const row = this.placements.get(id); if (!row)
        return null; const next = { ...row, ...patch }; this.placements.set(id, next); return next; }
    async listFeaturedPlacementsForPlace(placeId) { return [...this.placements.values()].filter((x) => x.placeId === placeId).sort((a, b) => a.sortOrder - b.sortOrder); }
    async appendAuditEvent(event) { this.auditEvents.push(event); }
    async listAuditEvents(entityType, entityId) { return this.auditEvents.filter((x) => (!entityType || x.entityType === entityType) && (!entityId || x.entityId === entityId)); }
}
