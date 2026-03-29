import { PlanTier, type EntitlementKey, type ResolvedEntitlements } from "./types.js";
import type { SubscriptionService } from "./service.js";
export type PremiumAdTier = "standard" | "reduced" | "none";
export type RecommendationTier = "standard" | "enhanced" | "elite";
export type CreatorContentAccessTier = "free" | "plus" | "elite";
export type PremiumQuotaFeature = "saved_places" | "custom_lists" | "places_per_list";
export interface PremiumExperienceState {
    userId: string;
    planTier: PlanTier;
    adTier: PremiumAdTier;
    recommendationTier: RecommendationTier;
    perks: string[];
    quotas: Record<PremiumQuotaFeature, number>;
    discoveryModules: Array<"premium_hidden_gems" | "premium_creator_spotlight" | "elite_city_pack">;
}
export declare class PremiumExperienceService {
    private readonly subscriptions;
    constructor(subscriptions: SubscriptionService);
    getPlanTier(userId: string): PlanTier;
    getUserEntitlements(userId: string): ResolvedEntitlements;
    hasEntitlement(userId: string, entitlement: EntitlementKey): boolean;
    adTierForUser(userId: string): PremiumAdTier;
    shouldShowAds(userId: string): boolean;
    allowedAdPlacementsForUser(userId: string): string[];
    shouldShowAdsForPlacement(userId: string, placement: string): boolean;
    getRecommendationTierContext(userId: string): {
        tier: RecommendationTier;
        candidateBoost: number;
        personalizationWeightBoost: number;
    };
    getQuotaForFeature(userId: string, feature: PremiumQuotaFeature): number;
    creatorAccessTierForUser(userId: string): CreatorContentAccessTier;
    shouldShowPremiumContent(userId: string | undefined, requiredTier: CreatorContentAccessTier): boolean;
    getPremiumDiscoveryModules(userId: string): PremiumExperienceState["discoveryModules"];
    getPremiumExperienceState(userId: string): PremiumExperienceState;
    explainQuota(userId: string, feature: PremiumQuotaFeature): {
        limit: number;
        label: string;
    };
}
