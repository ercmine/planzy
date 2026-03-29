import type { BusinessCampaign, BusinessEntitlementState, BusinessFeaturedPlacementSettings, BusinessLocationMembership, BusinessPremiumProfileSettings, BusinessTier } from "./types.js";
export interface BusinessPremiumStore {
    getTier(businessId: string): Promise<BusinessTier | undefined>;
    setTier(businessId: string, tier: BusinessTier): Promise<void>;
    getEntitlementState(businessId: string): Promise<BusinessEntitlementState | undefined>;
    putEntitlementState(state: BusinessEntitlementState): Promise<void>;
    upsertFeaturedPlacementSettings(settings: BusinessFeaturedPlacementSettings): Promise<BusinessFeaturedPlacementSettings>;
    listFeaturedPlacementSettings(businessId: string): Promise<BusinessFeaturedPlacementSettings[]>;
    upsertPremiumProfileSettings(settings: BusinessPremiumProfileSettings): Promise<BusinessPremiumProfileSettings>;
    getPremiumProfileSettings(businessId: string): Promise<BusinessPremiumProfileSettings | undefined>;
    putLocationMembership(membership: BusinessLocationMembership): Promise<void>;
    listLocationMemberships(businessId: string): Promise<BusinessLocationMembership[]>;
    createCampaign(campaign: BusinessCampaign): Promise<void>;
    getCampaign(campaignId: string): Promise<BusinessCampaign | undefined>;
    updateCampaign(campaignId: string, patch: Partial<BusinessCampaign>): Promise<BusinessCampaign | undefined>;
    listCampaignsByBusiness(businessId: string): Promise<BusinessCampaign[]>;
}
