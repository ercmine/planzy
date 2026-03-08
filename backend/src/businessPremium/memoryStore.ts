import type {
  BusinessCampaign,
  BusinessEntitlementState,
  BusinessFeaturedPlacementSettings,
  BusinessLocationMembership,
  BusinessPremiumProfileSettings,
  BusinessTier
} from "./types.js";
import type { BusinessPremiumStore } from "./store.js";

export class MemoryBusinessPremiumStore implements BusinessPremiumStore {
  private readonly tiers = new Map<string, BusinessTier>();
  private readonly entitlements = new Map<string, BusinessEntitlementState>();
  private readonly featured = new Map<string, BusinessFeaturedPlacementSettings>();
  private readonly profile = new Map<string, BusinessPremiumProfileSettings>();
  private readonly memberships = new Map<string, BusinessLocationMembership>();
  private readonly campaigns = new Map<string, BusinessCampaign>();

  async getTier(businessId: string): Promise<BusinessTier | undefined> { return this.tiers.get(businessId); }
  async setTier(businessId: string, tier: BusinessTier): Promise<void> { this.tiers.set(businessId, tier); }
  async getEntitlementState(businessId: string): Promise<BusinessEntitlementState | undefined> { return this.entitlements.get(businessId); }
  async putEntitlementState(state: BusinessEntitlementState): Promise<void> { this.entitlements.set(state.businessId, state); }

  async upsertFeaturedPlacementSettings(settings: BusinessFeaturedPlacementSettings): Promise<BusinessFeaturedPlacementSettings> {
    this.featured.set(`${settings.businessId}:${settings.placeId}`, settings);
    return settings;
  }
  async listFeaturedPlacementSettings(businessId: string): Promise<BusinessFeaturedPlacementSettings[]> {
    return [...this.featured.values()].filter((row) => row.businessId === businessId);
  }

  async upsertPremiumProfileSettings(settings: BusinessPremiumProfileSettings): Promise<BusinessPremiumProfileSettings> {
    this.profile.set(settings.businessId, settings);
    return settings;
  }
  async getPremiumProfileSettings(businessId: string): Promise<BusinessPremiumProfileSettings | undefined> { return this.profile.get(businessId); }

  async putLocationMembership(membership: BusinessLocationMembership): Promise<void> {
    this.memberships.set(`${membership.businessId}:${membership.locationId}`, membership);
  }
  async listLocationMemberships(businessId: string): Promise<BusinessLocationMembership[]> {
    return [...this.memberships.values()].filter((row) => row.businessId === businessId);
  }

  async createCampaign(campaign: BusinessCampaign): Promise<void> { this.campaigns.set(campaign.id, campaign); }
  async getCampaign(campaignId: string): Promise<BusinessCampaign | undefined> { return this.campaigns.get(campaignId); }
  async updateCampaign(campaignId: string, patch: Partial<BusinessCampaign>): Promise<BusinessCampaign | undefined> {
    const existing = this.campaigns.get(campaignId);
    if (!existing) return undefined;
    const next = { ...existing, ...patch };
    this.campaigns.set(campaignId, next);
    return next;
  }
  async listCampaignsByBusiness(businessId: string): Promise<BusinessCampaign[]> {
    return [...this.campaigns.values()].filter((row) => row.businessId === businessId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
