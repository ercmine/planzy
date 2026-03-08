import { PlanTier, SubscriptionTargetType, type EntitlementKey, type ResolvedEntitlements } from "./types.js";
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

const AD_PLACEMENT_ALLOWLIST: Record<PremiumAdTier, string[]> = {
  standard: ["results", "detail", "feed", "planner", "lists"],
  reduced: ["results", "feed", "planner"],
  none: []
};

function isUnlimited(value: number): boolean {
  return value >= 10_000;
}

function normalizePlanTier(entitlements: ResolvedEntitlements): PlanTier {
  if (entitlements.targetType !== SubscriptionTargetType.USER) {
    return PlanTier.FREE;
  }
  if (entitlements.values.ads_enabled) return PlanTier.FREE;
  if (entitlements.planId.includes("elite") || entitlements.planId.includes("pro")) return PlanTier.ELITE;
  return PlanTier.PLUS;
}

export class PremiumExperienceService {
  constructor(private readonly subscriptions: SubscriptionService) {}

  getPlanTier(userId: string): PlanTier {
    this.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
    return normalizePlanTier(this.subscriptions.getCurrentEntitlements(userId));
  }

  getUserEntitlements(userId: string): ResolvedEntitlements {
    this.subscriptions.ensureAccount(userId, SubscriptionTargetType.USER);
    return this.subscriptions.getCurrentEntitlements(userId);
  }

  hasEntitlement(userId: string, entitlement: EntitlementKey): boolean {
    const entitlements = this.getUserEntitlements(userId);
    return Boolean(entitlements.values[entitlement]);
  }

  adTierForUser(userId: string): PremiumAdTier {
    const tier = this.getPlanTier(userId);
    if (tier === PlanTier.ELITE) return "none";
    if (tier === PlanTier.PLUS) return "reduced";
    return "standard";
  }

  shouldShowAds(userId: string): boolean {
    return this.adTierForUser(userId) !== "none";
  }

  allowedAdPlacementsForUser(userId: string): string[] {
    return AD_PLACEMENT_ALLOWLIST[this.adTierForUser(userId)];
  }

  shouldShowAdsForPlacement(userId: string, placement: string): boolean {
    return this.allowedAdPlacementsForUser(userId).includes(placement);
  }

  getRecommendationTierContext(userId: string): { tier: RecommendationTier; candidateBoost: number; personalizationWeightBoost: number } {
    const tier = this.getPlanTier(userId);
    if (tier === PlanTier.ELITE) return { tier: "elite", candidateBoost: 2.1, personalizationWeightBoost: 1.35 };
    if (tier === PlanTier.PLUS) return { tier: "enhanced", candidateBoost: 1.5, personalizationWeightBoost: 1.18 };
    return { tier: "standard", candidateBoost: 1, personalizationWeightBoost: 1 };
  }

  getQuotaForFeature(userId: string, feature: PremiumQuotaFeature): number {
    const entitlements = this.getUserEntitlements(userId).values;
    if (feature === "saved_places") return Number(entitlements.max_saved_places ?? 20);
    if (feature === "custom_lists") return Number(entitlements.max_custom_lists ?? 2);
    if (feature === "places_per_list") return Number(entitlements.max_places_per_list ?? 20);
    return 0;
  }

  creatorAccessTierForUser(userId: string): CreatorContentAccessTier {
    const tier = this.getPlanTier(userId);
    if (tier === PlanTier.ELITE) return "elite";
    if (tier === PlanTier.PLUS) return "plus";
    return "free";
  }

  shouldShowPremiumContent(userId: string | undefined, requiredTier: CreatorContentAccessTier): boolean {
    if (!userId) return false;
    const viewerTier = this.creatorAccessTierForUser(userId);
    if (requiredTier === "free") return true;
    if (requiredTier === "plus") return viewerTier === "plus" || viewerTier === "elite";
    return viewerTier === "elite";
  }

  getPremiumDiscoveryModules(userId: string): PremiumExperienceState["discoveryModules"] {
    const tier = this.getPlanTier(userId);
    if (tier === PlanTier.ELITE) return ["premium_hidden_gems", "premium_creator_spotlight", "elite_city_pack"];
    if (tier === PlanTier.PLUS) return ["premium_hidden_gems", "premium_creator_spotlight"];
    return [];
  }

  getPremiumExperienceState(userId: string): PremiumExperienceState {
    const planTier = this.getPlanTier(userId);
    const quotas: PremiumExperienceState["quotas"] = {
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

  explainQuota(userId: string, feature: PremiumQuotaFeature): { limit: number; label: string } {
    const limit = this.getQuotaForFeature(userId, feature);
    return { limit, label: isUnlimited(limit) ? "Unlimited" : `${limit}` };
  }
}
