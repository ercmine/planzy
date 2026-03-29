import type { BusinessCampaign, BusinessCampaignStatus, BusinessEntitlementKey, BusinessEntitlementState, BusinessFeaturedPlacementSettings, BusinessLocationMembership, BusinessPremiumProfileSettings, BusinessTier, BusinessUpgradeContext, FeaturedPlacementEligibilityInput, FeaturedPlacementEligibilityResult } from "./types.js";
import type { BusinessPremiumStore } from "./store.js";
export declare class BusinessPremiumService {
    private readonly store;
    private readonly now;
    constructor(store: BusinessPremiumStore, now?: () => Date);
    getBusinessTier(businessId: string): Promise<BusinessTier>;
    setBusinessTier(businessId: string, tier: BusinessTier): Promise<BusinessEntitlementState>;
    getBusinessEntitlements(businessId: string): Promise<BusinessEntitlementState>;
    hasBusinessEntitlement(businessId: string, entitlement: BusinessEntitlementKey): Promise<boolean>;
    getBusinessQuota(businessId: string, feature: keyof BusinessEntitlementState["quotas"]): Promise<number>;
    canUseFeaturedPlacement(businessId: string): Promise<boolean>;
    canAccessAdvancedBusinessAnalytics(businessId: string): Promise<boolean>;
    canManageMultipleLocations(businessId: string): Promise<boolean>;
    canRunBusinessCampaigns(businessId: string): Promise<boolean>;
    canAccessCreatorCollab(businessId: string): Promise<boolean>;
    evaluateFeaturedPlacementEligibility(input: FeaturedPlacementEligibilityInput): Promise<FeaturedPlacementEligibilityResult>;
    updateBusinessFeaturedPlacementSettings(settings: Omit<BusinessFeaturedPlacementSettings, "updatedAt">): Promise<BusinessFeaturedPlacementSettings>;
    updateBusinessEnhancedProfileSettings(settings: Omit<BusinessPremiumProfileSettings, "updatedAt">): Promise<BusinessPremiumProfileSettings>;
    listBusinessLocations(businessId: string): Promise<BusinessLocationMembership[]>;
    upsertBusinessLocation(input: Omit<BusinessLocationMembership, "updatedAt">): Promise<void>;
    getBusinessLocationRollup(businessId: string): Promise<{
        locations: BusinessLocationMembership[];
        averageHealth: number;
        averageCompleteness: number;
    }>;
    createBusinessCampaign(input: Omit<BusinessCampaign, "id" | "createdAt" | "updatedAt">): Promise<BusinessCampaign>;
    updateBusinessCampaign(campaignId: string, patch: Partial<BusinessCampaign>): Promise<BusinessCampaign>;
    transitionBusinessCampaign(campaignId: string, nextStatus: BusinessCampaignStatus): Promise<BusinessCampaign>;
    linkCampaignToLocations(campaignId: string, locationIds: string[]): Promise<BusinessCampaign>;
    linkCampaignToCreators(campaignId: string, creatorIds: string[]): Promise<BusinessCampaign>;
    getBusinessUpgradeContext(businessId: string): Promise<BusinessUpgradeContext>;
    private computeState;
    static tierAtLeast(current: BusinessTier, required: BusinessTier): boolean;
}
