import { randomUUID } from "node:crypto";
import { ValidationError } from "../plans/errors.js";
const TIER_ORDER = { standard: 0, pro: 1, elite: 2 };
const ENTITLEMENT_MATRIX = {
    standard: {
        "business.analytics.advanced": false,
        "business.featuredPlacement.eligible": false,
        "business.creatorCollab.enabled": false,
        "business.locations.multiLocation": false,
        "business.campaigns.enabled": false,
        "business.profile.enhanced": false,
        "business.reporting.export": false,
        "business.insights.audienceBreakdown": false,
        "business.insights.creatorImpact": false,
        "business.insights.competitiveBenchmarksScaffold": false,
        "business.support.priority": false
    },
    pro: {
        "business.analytics.advanced": true,
        "business.featuredPlacement.eligible": true,
        "business.creatorCollab.enabled": true,
        "business.locations.multiLocation": false,
        "business.campaigns.enabled": true,
        "business.profile.enhanced": true,
        "business.reporting.export": true,
        "business.insights.audienceBreakdown": true,
        "business.insights.creatorImpact": true,
        "business.insights.competitiveBenchmarksScaffold": true,
        "business.support.priority": false
    },
    elite: {
        "business.analytics.advanced": true,
        "business.featuredPlacement.eligible": true,
        "business.creatorCollab.enabled": true,
        "business.locations.multiLocation": true,
        "business.campaigns.enabled": true,
        "business.profile.enhanced": true,
        "business.reporting.export": true,
        "business.insights.audienceBreakdown": true,
        "business.insights.creatorImpact": true,
        "business.insights.competitiveBenchmarksScaffold": true,
        "business.support.priority": true
    }
};
const QUOTA_MATRIX = {
    standard: { maxLocations: 1, monthlyCampaigns: 0, featuredPlacements: 0, creatorInvitesMonthly: 0 },
    pro: { maxLocations: 3, monthlyCampaigns: 8, featuredPlacements: 3, creatorInvitesMonthly: 12 },
    elite: { maxLocations: 50, monthlyCampaigns: 100, featuredPlacements: 20, creatorInvitesMonthly: 100 }
};
const STATUS_TRANSITIONS = {
    draft: ["active", "archived"],
    active: ["paused", "completed", "archived"],
    paused: ["active", "completed", "archived"],
    completed: ["archived"],
    archived: []
};
export class BusinessPremiumService {
    store;
    now;
    constructor(store, now = () => new Date()) {
        this.store = store;
        this.now = now;
    }
    async getBusinessTier(businessId) {
        return (await this.store.getTier(businessId)) ?? "standard";
    }
    async setBusinessTier(businessId, tier) {
        await this.store.setTier(businessId, tier);
        const state = await this.computeState(businessId, tier);
        await this.store.putEntitlementState(state);
        return state;
    }
    async getBusinessEntitlements(businessId) {
        return (await this.store.getEntitlementState(businessId)) ?? this.computeState(businessId, await this.getBusinessTier(businessId));
    }
    async hasBusinessEntitlement(businessId, entitlement) {
        const state = await this.getBusinessEntitlements(businessId);
        return Boolean(state.entitlements[entitlement]);
    }
    async getBusinessQuota(businessId, feature) {
        const state = await this.getBusinessEntitlements(businessId);
        return state.quotas[feature];
    }
    async canUseFeaturedPlacement(businessId) {
        return this.hasBusinessEntitlement(businessId, "business.featuredPlacement.eligible");
    }
    async canAccessAdvancedBusinessAnalytics(businessId) {
        return this.hasBusinessEntitlement(businessId, "business.analytics.advanced");
    }
    async canManageMultipleLocations(businessId) {
        return this.hasBusinessEntitlement(businessId, "business.locations.multiLocation");
    }
    async canRunBusinessCampaigns(businessId) {
        return this.hasBusinessEntitlement(businessId, "business.campaigns.enabled");
    }
    async canAccessCreatorCollab(businessId) {
        return this.hasBusinessEntitlement(businessId, "business.creatorCollab.enabled");
    }
    async evaluateFeaturedPlacementEligibility(input) {
        const reasons = [];
        if (!(await this.canUseFeaturedPlacement(input.businessId)))
            reasons.push("business_not_entitled");
        if (!input.isVerified)
            reasons.push("business_not_verified");
        if (!input.moderationHealthy)
            reasons.push("moderation_unhealthy");
        if (!input.inventoryAvailable)
            reasons.push("inventory_unavailable");
        if (!input.campaignTargetMatch)
            reasons.push("campaign_target_mismatch");
        const score = Math.max(0, Math.min(100, Math.round((input.profileCompleteness * 0.25) + (input.trustScore * 0.75))));
        if (score < 60)
            reasons.push("quality_threshold_not_met");
        return { eligible: reasons.length === 0, reasons, score, requiresDisclosure: true };
    }
    async updateBusinessFeaturedPlacementSettings(settings) {
        const canUse = await this.canUseFeaturedPlacement(settings.businessId);
        if (!canUse)
            throw new Error("FEATURED_PLACEMENT_LOCKED");
        const eligibility = await this.evaluateFeaturedPlacementEligibility({
            businessId: settings.businessId,
            placeId: settings.placeId,
            category: settings.targetCategories[0] ?? "unknown",
            city: settings.targetCities[0] ?? "unknown",
            isVerified: settings.eligible,
            moderationHealthy: true,
            profileCompleteness: 80,
            trustScore: 75,
            inventoryAvailable: true,
            campaignTargetMatch: true
        });
        if (!eligibility.eligible)
            throw new Error("FEATURED_POLICY_DENIED");
        return this.store.upsertFeaturedPlacementSettings({ ...settings, updatedAt: this.now().toISOString() });
    }
    async updateBusinessEnhancedProfileSettings(settings) {
        if (!(await this.hasBusinessEntitlement(settings.businessId, "business.profile.enhanced")))
            throw new Error("ENHANCED_PROFILE_LOCKED");
        return this.store.upsertPremiumProfileSettings({ ...settings, updatedAt: this.now().toISOString() });
    }
    async listBusinessLocations(businessId) {
        return this.store.listLocationMemberships(businessId);
    }
    async upsertBusinessLocation(input) {
        const existing = await this.store.listLocationMemberships(input.businessId);
        const already = existing.some((row) => row.locationId === input.locationId);
        if (!already && existing.length >= await this.getBusinessQuota(input.businessId, "maxLocations")) {
            throw new Error("MULTI_LOCATION_LIMIT_REACHED");
        }
        await this.store.putLocationMembership({ ...input, updatedAt: this.now().toISOString() });
    }
    async getBusinessLocationRollup(businessId) {
        const locations = await this.store.listLocationMemberships(businessId);
        const denominator = locations.length || 1;
        return {
            locations,
            averageHealth: Number((locations.reduce((sum, row) => sum + row.healthScore, 0) / denominator).toFixed(2)),
            averageCompleteness: Number((locations.reduce((sum, row) => sum + row.completenessScore, 0) / denominator).toFixed(2))
        };
    }
    async createBusinessCampaign(input) {
        if (!(await this.canRunBusinessCampaigns(input.businessId)))
            throw new Error("CAMPAIGNS_LOCKED");
        const id = randomUUID();
        const nowIso = this.now().toISOString();
        const campaign = { ...input, id, createdAt: nowIso, updatedAt: nowIso };
        await this.store.createCampaign(campaign);
        return campaign;
    }
    async updateBusinessCampaign(campaignId, patch) {
        const existing = await this.store.getCampaign(campaignId);
        if (!existing)
            throw new ValidationError(["campaign not found"]);
        const updated = await this.store.updateCampaign(campaignId, { ...patch, updatedAt: this.now().toISOString() });
        if (!updated)
            throw new ValidationError(["campaign not found"]);
        return updated;
    }
    async transitionBusinessCampaign(campaignId, nextStatus) {
        const existing = await this.store.getCampaign(campaignId);
        if (!existing)
            throw new ValidationError(["campaign not found"]);
        if (!STATUS_TRANSITIONS[existing.status].includes(nextStatus))
            throw new ValidationError([`invalid transition ${existing.status} -> ${nextStatus}`]);
        return this.updateBusinessCampaign(campaignId, { status: nextStatus });
    }
    async linkCampaignToLocations(campaignId, locationIds) {
        const campaign = await this.store.getCampaign(campaignId);
        if (!campaign)
            throw new ValidationError(["campaign not found"]);
        const memberships = await this.store.listLocationMemberships(campaign.businessId);
        const membershipSet = new Set(memberships.map((row) => row.locationId));
        if (locationIds.some((locationId) => !membershipSet.has(locationId)))
            throw new Error("CAMPAIGN_LOCATION_NOT_OWNED");
        return this.updateBusinessCampaign(campaignId, { targetLocationIds: locationIds });
    }
    async linkCampaignToCreators(campaignId, creatorIds) {
        return this.updateBusinessCampaign(campaignId, { linkedCreatorIds: creatorIds });
    }
    async getBusinessUpgradeContext(businessId) {
        const state = await this.getBusinessEntitlements(businessId);
        const locked = Object.keys(state.entitlements)
            .filter((key) => !state.entitlements[key])
            .map((feature) => ({ feature, recommendedTier: feature === "business.locations.multiLocation" || feature === "business.support.priority" ? "elite" : "pro", message: `Upgrade to unlock ${feature}.` }));
        return { businessId, currentTier: state.tier, locked };
    }
    computeState(businessId, tier) {
        return {
            businessId,
            tier,
            entitlements: ENTITLEMENT_MATRIX[tier],
            quotas: QUOTA_MATRIX[tier]
        };
    }
    static tierAtLeast(current, required) {
        return TIER_ORDER[current] >= TIER_ORDER[required];
    }
}
