export declare const ROLLOUT_FEATURE_KEYS: {
    readonly AI_ITINERARY: "ai.itinerary";
    readonly REVIEWS_VIDEO: "reviews.video";
    readonly CREATOR_ANALYTICS_V2: "creator.analytics.v2";
    readonly CREATOR_MONETIZATION: "creator.monetization";
    readonly BUSINESS_COLLABORATION: "business.collaboration";
    readonly PREMIUM_PRICING_V2: "premium.pricing_v2";
    readonly RECOMMENDATIONS_PERSONALIZED_V2: "recommendations.personalized_v2";
    readonly ADS_REBALANCED_LAYOUT: "ads.rebalanced_layout";
    readonly PLACES_FOURSQUARE_INGEST: "places.foursquare_ingest";
};
export type RolloutFeatureKey = typeof ROLLOUT_FEATURE_KEYS[keyof typeof ROLLOUT_FEATURE_KEYS];
export declare const ALL_ROLLOUT_FEATURE_KEYS: ("ai.itinerary" | "reviews.video" | "creator.analytics.v2" | "creator.monetization" | "business.collaboration" | "premium.pricing_v2" | "recommendations.personalized_v2" | "ads.rebalanced_layout" | "places.foursquare_ingest")[];
