import { ENTITLEMENT_DEFINITIONS } from "./entitlementDefinitions.js";
import { AccountType, PlanTier, type EntitlementKey, type EntitlementValue, type SubscriptionPlan } from "./types.js";

const defaults = Object.fromEntries(ENTITLEMENT_DEFINITIONS.map((d) => [d.key, d.defaultValue])) as Record<EntitlementKey, EntitlementValue>;

function plan(input: Omit<SubscriptionPlan, "entitlements"> & { entitlements?: Partial<Record<EntitlementKey, EntitlementValue>> }): SubscriptionPlan {
  return { ...input, entitlements: { ...defaults, ...(input.entitlements ?? {}) } };
}

export const PLAN_CATALOG: SubscriptionPlan[] = [
  plan({ id: "user-free", accountType: AccountType.USER, tier: PlanTier.FREE, displayName: "User Free", monthlyPriceCents: 0, billable: false, visible: true, saleable: true, upgradePlanIds: ["user-plus", "user-pro"], downgradePlanIds: [], entitlements: { ads_enabled: true } }),
  plan({ id: "user-plus", accountType: AccountType.USER, tier: PlanTier.PLUS, displayName: "User Plus", monthlyPriceCents: 799, billable: true, visible: true, saleable: true, upgradePlanIds: ["user-pro"], downgradePlanIds: ["user-free"], entitlements: { ads_enabled: false, advanced_search: true, ai_recommendations: true, max_saved_places: 200, max_custom_lists: 20, max_photo_reviews_per_month: 40, max_video_reviews_per_month: 5, max_video_duration_seconds: 30, can_purchase_promotions: true } }),
  plan({ id: "user-pro", accountType: AccountType.USER, tier: PlanTier.PRO, displayName: "User Pro", monthlyPriceCents: 1499, billable: true, visible: true, saleable: true, upgradePlanIds: [], downgradePlanIds: ["user-plus", "user-free"], entitlements: { ads_enabled: false, advanced_search: true, ai_recommendations: true, ai_itinerary_generation: true, priority_support: true, max_saved_places: 1000, max_custom_lists: 100, max_photo_reviews_per_month: 120, max_video_reviews_per_month: 30, max_video_duration_seconds: 120, can_access_beta_features: true, can_purchase_promotions: true, can_be_featured: true } }),

  plan({ id: "creator-free", accountType: AccountType.CREATOR, tier: PlanTier.FREE, displayName: "Creator Free", monthlyPriceCents: 0, billable: false, visible: true, saleable: true, upgradePlanIds: ["creator-pro", "creator-elite"], downgradePlanIds: [], entitlements: { creator_profile_enabled: true, max_creator_guides: 2, max_collaborations_per_month: 2 } }),
  plan({ id: "creator-pro", accountType: AccountType.CREATOR, tier: PlanTier.PRO, displayName: "Creator Pro", monthlyPriceCents: 1999, billable: true, visible: true, saleable: true, upgradePlanIds: ["creator-elite"], downgradePlanIds: ["creator-free"], entitlements: { creator_profile_enabled: true, creator_analytics: true, creator_monetization_tools: true, creator_verified_eligibility: true, max_creator_guides: 25, max_collaborations_per_month: 30, max_featured_posts: 10, can_be_featured: true } }),
  plan({ id: "creator-elite", accountType: AccountType.CREATOR, tier: PlanTier.ELITE, displayName: "Creator Elite", monthlyPriceCents: 4999, billable: true, visible: true, saleable: true, upgradePlanIds: [], downgradePlanIds: ["creator-pro", "creator-free"], entitlements: { creator_profile_enabled: true, creator_analytics: true, creator_monetization_tools: true, creator_verified_eligibility: true, premium_creator_badge: true, priority_support: true, max_creator_guides: 200, max_collaborations_per_month: 200, max_featured_posts: 100, can_access_beta_features: true, can_be_featured: true, can_receive_priority_ranking: true } }),

  plan({ id: "business-free", accountType: AccountType.BUSINESS, tier: PlanTier.FREE, displayName: "Business Free", monthlyPriceCents: 0, billable: false, visible: true, saleable: true, upgradePlanIds: ["business-plus", "business-elite"], downgradePlanIds: [], entitlements: { business_claiming_enabled: true, max_places_claimed: 1, max_business_locations: 1 } }),
  plan({ id: "business-plus", accountType: AccountType.BUSINESS, tier: PlanTier.PLUS, displayName: "Business Plus", monthlyPriceCents: 2999, billable: true, visible: true, saleable: true, upgradePlanIds: ["business-elite"], downgradePlanIds: ["business-free"], entitlements: { business_claiming_enabled: true, business_analytics: true, business_reply_to_reviews: true, business_promotions: true, max_places_claimed: 5, max_business_locations: 10, business_team_members: 5, can_purchase_promotions: true } }),
  plan({ id: "business-elite", accountType: AccountType.BUSINESS, tier: PlanTier.ELITE, displayName: "Business Elite", monthlyPriceCents: 8999, billable: true, visible: true, saleable: true, upgradePlanIds: [], downgradePlanIds: ["business-plus", "business-free"], entitlements: { business_claiming_enabled: true, business_analytics: true, business_reply_to_reviews: true, business_promotions: true, priority_support: true, max_places_claimed: 100, max_business_locations: 200, business_team_members: 50, can_purchase_promotions: true, can_receive_priority_ranking: true } })
];

export function getPlan(planId: string): SubscriptionPlan | undefined {
  return PLAN_CATALOG.find((plan) => plan.id === planId);
}

export function getAvailablePlans(accountType: AccountType): SubscriptionPlan[] {
  return PLAN_CATALOG.filter((plan) => plan.accountType === accountType && plan.visible);
}
