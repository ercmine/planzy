export const ROLLOUT_FEATURE_KEYS = {
  AI_ITINERARY: "ai.itinerary",
  REVIEWS_VIDEO: "reviews.video",
  CREATOR_ANALYTICS_V2: "creator.analytics.v2",
  CREATOR_MONETIZATION: "creator.monetization",
  BUSINESS_COLLABORATION: "business.collaboration",
  PREMIUM_PRICING_V2: "premium.pricing_v2",
  RECOMMENDATIONS_PERSONALIZED_V2: "recommendations.personalized_v2",
  ADS_REBALANCED_LAYOUT: "ads.rebalanced_layout",
  PLACES_FOURSQUARE_INGEST: "places.foursquare_ingest"
} as const;

export type RolloutFeatureKey = typeof ROLLOUT_FEATURE_KEYS[keyof typeof ROLLOUT_FEATURE_KEYS];

export const ALL_ROLLOUT_FEATURE_KEYS = Object.values(ROLLOUT_FEATURE_KEYS);
