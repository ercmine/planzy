export const ANALYTICS_EVENT_CATEGORIES = {
  DISCOVERY: "discovery",
  REVIEWS: "reviews",
  MEDIA: "media",
  ADS: "ads",
  SUBSCRIPTIONS: "subscriptions",
  CONVERSIONS: "conversions",
  CREATOR: "creator_engagement",
  BUSINESS: "business_engagement",
  SYSTEM: "system"
} as const;

export type AnalyticsEventCategory = typeof ANALYTICS_EVENT_CATEGORIES[keyof typeof ANALYTICS_EVENT_CATEGORIES];

export const ANALYTICS_EVENT_NAMES = {
  app_session_started: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  search_submitted: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  search_results_viewed: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  category_page_viewed: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  city_page_viewed: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  nearby_results_viewed: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  trending_place_viewed: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  place_card_impression: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  place_card_opened: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  recommendation_impression: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  recommendation_opened: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,
  pagination_loaded: ANALYTICS_EVENT_CATEGORIES.DISCOVERY,

  review_composer_opened: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_submitted: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_approved: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_rejected: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_edited: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_deleted: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_viewed: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_helpful_clicked: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_reply_created: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  business_reply_created: ANALYTICS_EVENT_CATEGORIES.REVIEWS,
  review_report_submitted: ANALYTICS_EVENT_CATEGORIES.REVIEWS,

  video_upload_started: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_upload_completed: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_transcoding_completed: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_play_started: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_play_25: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_play_50: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_play_75: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  video_play_completed: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  place_media_gallery_viewed: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  media_item_clicked: ANALYTICS_EVENT_CATEGORIES.MEDIA,
  creator_media_engagement: ANALYTICS_EVENT_CATEGORIES.MEDIA,

  ad_requested: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_loaded: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_load_failed: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_impression: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_clicked: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_placement_rendered: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_suppressed_by_entitlement: ANALYTICS_EVENT_CATEGORIES.ADS,
  ad_fallback_triggered: ANALYTICS_EVENT_CATEGORIES.ADS,

  paywall_viewed: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  upgrade_cta_clicked: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  checkout_started: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  trial_started: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  subscription_purchased: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  subscription_renewed: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  subscription_renewal_failed: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  subscription_cancellation_requested: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  subscription_cancellation_effective: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  grace_period_entered: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  entitlement_unlocked: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  feature_gate_hit: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,
  quota_limit_reached: ANALYTICS_EVENT_CATEGORIES.SUBSCRIPTIONS,

  free_to_paid_converted: ANALYTICS_EVENT_CATEGORIES.CONVERSIONS,
  creator_upgrade_converted: ANALYTICS_EVENT_CATEGORIES.CONVERSIONS,
  business_upgrade_converted: ANALYTICS_EVENT_CATEGORIES.CONVERSIONS,
  creator_follow_converted_from_place: ANALYTICS_EVENT_CATEGORIES.CONVERSIONS,
  recommendation_to_place_conversion: ANALYTICS_EVENT_CATEGORIES.CONVERSIONS,

  creator_profile_viewed: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_followed: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_unfollowed: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_guide_viewed: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_guide_saved: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_guide_shared: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_video_played: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_milestone_reached: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_collaboration_invite_received: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_collaboration_invite_accepted: ANALYTICS_EVENT_CATEGORIES.CREATOR,
  creator_collaboration_invite_declined: ANALYTICS_EVENT_CATEGORIES.CREATOR,

  business_profile_viewed: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_claim_started: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_claim_completed: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_dashboard_viewed: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_reply_posted: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_profile_updated: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_analytics_viewed: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_campaign_action_taken: ANALYTICS_EVENT_CATEGORIES.BUSINESS,
  business_cta_clicked: ANALYTICS_EVENT_CATEGORIES.BUSINESS
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_NAMES;

export function resolveEventCategory(eventName: AnalyticsEventName): AnalyticsEventCategory {
  return ANALYTICS_EVENT_NAMES[eventName];
}
