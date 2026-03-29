export type BusinessTier = "standard" | "pro" | "elite";
export type BusinessEntitlementKey = "business.analytics.advanced" | "business.featuredPlacement.eligible" | "business.creatorCollab.enabled" | "business.locations.multiLocation" | "business.campaigns.enabled" | "business.profile.enhanced" | "business.reporting.export" | "business.insights.audienceBreakdown" | "business.insights.creatorImpact" | "business.insights.competitiveBenchmarksScaffold" | "business.support.priority";
export interface BusinessEntitlementState {
    businessId: string;
    tier: BusinessTier;
    entitlements: Record<BusinessEntitlementKey, boolean>;
    quotas: {
        maxLocations: number;
        monthlyCampaigns: number;
        featuredPlacements: number;
        creatorInvitesMonthly: number;
    };
}
export interface BusinessPremiumProfileSettings {
    businessId: string;
    enhancedDescription?: string;
    pinnedAnnouncement?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    featuredGalleryImageUrls?: string[];
    premiumBadgeEnabled: boolean;
    campaignSpotlightCampaignId?: string;
    creatorPartnershipHeadline?: string;
    updatedAt: string;
}
export interface BusinessFeaturedPlacementSettings {
    businessId: string;
    placeId: string;
    eligible: boolean;
    enabled: boolean;
    label: "featured" | "sponsored";
    assetContentIds: string[];
    targetCities: string[];
    targetCategories: string[];
    scheduledStartAt?: string;
    scheduledEndAt?: string;
    linkedCampaignId?: string;
    dailyBudgetCap?: number;
    updatedAt: string;
}
export interface BusinessLocationMembership {
    businessId: string;
    locationId: string;
    role: "primary" | "managed";
    healthScore: number;
    completenessScore: number;
    updatedAt: string;
}
export type BusinessCampaignStatus = "draft" | "active" | "paused" | "completed" | "archived";
export interface BusinessCampaign {
    id: string;
    businessId: string;
    name: string;
    status: BusinessCampaignStatus;
    objective: "featured_visibility" | "creator_collaboration" | "seasonal_promotion" | "launch" | "local_event";
    targetLocationIds: string[];
    targetCities: string[];
    targetCategories: string[];
    linkedCreatorIds: string[];
    linkedFeaturedPlacementIds: string[];
    startsAt?: string;
    endsAt?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    budgetAmount?: number;
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
}
export interface FeaturedPlacementEligibilityInput {
    businessId: string;
    placeId: string;
    category: string;
    city: string;
    isVerified: boolean;
    moderationHealthy: boolean;
    profileCompleteness: number;
    trustScore: number;
    inventoryAvailable: boolean;
    campaignTargetMatch: boolean;
}
export interface FeaturedPlacementEligibilityResult {
    eligible: boolean;
    reasons: string[];
    score: number;
    requiresDisclosure: boolean;
}
export interface BusinessUpgradeContext {
    businessId: string;
    currentTier: BusinessTier;
    locked: Array<{
        feature: BusinessEntitlementKey;
        recommendedTier: Exclude<BusinessTier, "standard">;
        message: string;
    }>;
}
