import { PlanTier, SubscriptionTargetType } from "./types.js";
const AD_PLACEMENT_ALLOWLIST = {
    standard: ["results", "detail", "feed", "planner", "lists"],
    reduced: ["results", "feed", "planner"],
    none: []
};
function isUnlimited(value) {
    return value >= 10_000;
}
function normalizePlanTier(entitlements) {
    if (entitlements.targetType !== SubscriptionTargetType.USER) {
        return PlanTier.FREE;
    }
    if (entitlements.values.ads_enabled)
        return PlanTier.FREE;
    if (entitlements.planId.includes("elite") || entitlements.planId.includes("pro"))
        return PlanTier.ELITE;
    return PlanTier.PLUS;
}
export class PremiumExperienceService {
    subscriptions;
    constructor(subscriptions) {
        this.subscriptions = subscriptions;
    }
    getPlanTier(userId) {
        this.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
        return normalizePlanTier(this.subscriptions.getCurrentEntitlements(userId));
    }
    getUserEntitlements(userId) {
        this.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
        return this.subscriptions.getCurrentEntitlements(userId);
    }
    hasEntitlement(userId, entitlement) {
        const entitlements = this.getUserEntitlements(userId);
        return Boolean(entitlements.values[entitlement]);
    }
    adTierForUser(userId) {
        const tier = this.getPlanTier(userId);
        if (tier === PlanTier.ELITE)
            return "none";
        if (tier === PlanTier.PLUS)
            return "reduced";
        return "standard";
    }
    shouldShowAds(userId) {
        return this.adTierForUser(userId) !== "none";
    }
    allowedAdPlacementsForUser(userId) {
        return AD_PLACEMENT_ALLOWLIST[this.adTierForUser(userId)];
    }
    shouldShowAdsForPlacement(userId, placement) {
        return this.allowedAdPlacementsForUser(userId).includes(placement);
    }
    getRecommendationTierContext(userId) {
        const tier = this.getPlanTier(userId);
        if (tier === PlanTier.ELITE)
            return { tier: "elite", candidateBoost: 2.1, personalizationWeightBoost: 1.35 };
        if (tier === PlanTier.PLUS)
            return { tier: "enhanced", candidateBoost: 1.5, personalizationWeightBoost: 1.18 };
        return { tier: "standard", candidateBoost: 1, personalizationWeightBoost: 1 };
    }
    getQuotaForFeature(userId, feature) {
        const entitlements = this.getUserEntitlements(userId).values;
        if (feature === "saved_places")
            return Number(entitlements.max_saved_places ?? 20);
        if (feature === "custom_lists")
            return Number(entitlements.max_custom_lists ?? 2);
        if (feature === "places_per_list")
            return Number(entitlements.max_places_per_list ?? 20);
        return 0;
    }
    creatorAccessTierForUser(userId) {
        const tier = this.getPlanTier(userId);
        if (tier === PlanTier.ELITE)
            return "elite";
        if (tier === PlanTier.PLUS)
            return "plus";
        return "free";
    }
    shouldShowPremiumContent(userId, requiredTier) {
        if (!userId)
            return false;
        const viewerTier = this.creatorAccessTierForUser(userId);
        if (requiredTier === "free")
            return true;
        if (requiredTier === "plus")
            return viewerTier === "plus" || viewerTier === "elite";
        return viewerTier === "elite";
    }
    getPremiumDiscoveryModules(userId) {
        const tier = this.getPlanTier(userId);
        if (tier === PlanTier.ELITE)
            return ["premium_hidden_gems", "premium_creator_spotlight", "elite_city_pack"];
        if (tier === PlanTier.PLUS)
            return ["premium_hidden_gems", "premium_creator_spotlight"];
        return [];
    }
    getPremiumExperienceState(userId) {
        const planTier = this.getPlanTier(userId);
        const quotas = {
            saved_places: this.getQuotaForFeature(userId, "saved_places"),
            custom_lists: this.getQuotaForFeature(userId, "custom_lists"),
            places_per_list: this.getQuotaForFeature(userId, "places_per_list")
        };
        const perks = [
            this.adTierForUser(userId) === "standard" ? "standard_ads" : this.adTierForUser(userId) === "reduced" ? "reduced_ads" : "ad_free",
            planTier === PlanTier.FREE ? "standard_recommendations" : "enhanced_recommendations",
            planTier === PlanTier.ELITE ? "elite_priority_discovery" : ""
        ].filter(Boolean);
        return {
            userId,
            planTier,
            adTier: this.adTierForUser(userId),
            recommendationTier: this.getRecommendationTierContext(userId).tier,
            perks,
            quotas,
            discoveryModules: this.getPremiumDiscoveryModules(userId)
        };
    }
    explainQuota(userId, feature) {
        const limit = this.getQuotaForFeature(userId, feature);
        return { limit, label: isUnlimited(limit) ? "Unlimited" : `${limit}` };
    }
}
