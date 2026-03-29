export class MemoryBusinessPremiumStore {
    tiers = new Map();
    entitlements = new Map();
    featured = new Map();
    profile = new Map();
    memberships = new Map();
    campaigns = new Map();
    async getTier(businessId) { return this.tiers.get(businessId); }
    async setTier(businessId, tier) { this.tiers.set(businessId, tier); }
    async getEntitlementState(businessId) { return this.entitlements.get(businessId); }
    async putEntitlementState(state) { this.entitlements.set(state.businessId, state); }
    async upsertFeaturedPlacementSettings(settings) {
        this.featured.set(`${settings.businessId}:${settings.placeId}`, settings);
        return settings;
    }
    async listFeaturedPlacementSettings(businessId) {
        return [...this.featured.values()].filter((row) => row.businessId === businessId);
    }
    async upsertPremiumProfileSettings(settings) {
        this.profile.set(settings.businessId, settings);
        return settings;
    }
    async getPremiumProfileSettings(businessId) { return this.profile.get(businessId); }
    async putLocationMembership(membership) {
        this.memberships.set(`${membership.businessId}:${membership.locationId}`, membership);
    }
    async listLocationMemberships(businessId) {
        return [...this.memberships.values()].filter((row) => row.businessId === businessId);
    }
    async createCampaign(campaign) { this.campaigns.set(campaign.id, campaign); }
    async getCampaign(campaignId) { return this.campaigns.get(campaignId); }
    async updateCampaign(campaignId, patch) {
        const existing = this.campaigns.get(campaignId);
        if (!existing)
            return undefined;
        const next = { ...existing, ...patch };
        this.campaigns.set(campaignId, next);
        return next;
    }
    async listCampaignsByBusiness(businessId) {
        return [...this.campaigns.values()].filter((row) => row.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
}
