import type { CreatorProfile } from "../accounts/types.js";
export type CreatorTier = "standard" | "pro" | "elite";
export declare const CREATOR_ENTITLEMENTS: {
    readonly ANALYTICS_ADVANCED: "creator.analytics.advanced";
    readonly MEDIA_EXPANDED_UPLOADS: "creator.media.expandedUploads";
    readonly MEDIA_EXPANDED_VIDEO_LIMITS: "creator.media.expandedVideoLimits";
    readonly DISCOVERY_BOOST_ELIGIBLE: "creator.discovery.boostEligible";
    readonly PROFILE_BRANDING: "creator.profile.branding";
    readonly MONETIZATION_ENABLED: "creator.monetization.enabled";
    readonly GUIDES_PREMIUM_FORMATS: "creator.guides.premiumFormats";
    readonly PRIORITY_SUPPORT: "creator.prioritySupport";
    readonly COLLAB_ENHANCED: "creator.collab.enhanced";
    readonly INSIGHTS_AUDIENCE_BREAKDOWN: "creator.insights.audienceBreakdown";
    readonly INSIGHTS_CONTENT_PERFORMANCE_DETAILED: "creator.insights.contentPerformanceDetailed";
};
export type CreatorEntitlementKey = typeof CREATOR_ENTITLEMENTS[keyof typeof CREATOR_ENTITLEMENTS];
export declare const CREATOR_QUOTAS: {
    readonly REVIEWS_PUBLISHED: "creator.reviews.published";
    readonly PHOTOS_PER_REVIEW: "creator.media.photosPerReview";
    readonly VIDEOS_PER_MONTH: "creator.media.videosPerMonth";
    readonly VIDEO_DURATION_SECONDS: "creator.media.videoDurationSeconds";
    readonly VIDEO_SIZE_MB: "creator.media.videoSizeMb";
    readonly GALLERY_SIZE: "creator.media.gallerySize";
    readonly GUIDES_TOTAL: "creator.guides.total";
    readonly GUIDE_PLACES_PER_GUIDE: "creator.guides.placesPerGuide";
    readonly DRAFTS_TOTAL: "creator.content.drafts";
    readonly PREMIUM_CONTENT_ITEMS: "creator.content.premiumItems";
    readonly BRANDING_ASSETS: "creator.profile.brandingAssets";
};
export type CreatorQuotaKey = typeof CREATOR_QUOTAS[keyof typeof CREATOR_QUOTAS];
export interface CreatorPremiumState {
    creatorProfileId: string;
    tier: CreatorTier;
    entitlements: Record<CreatorEntitlementKey, boolean>;
    badges: string[];
}
export interface CreatorQuotaStateItem {
    key: CreatorQuotaKey;
    limit: number;
    usage: number;
    remaining: number;
}
export interface CreatorAnalyticsEvent {
    creatorProfileId: string;
    eventType: "profile_view" | "follow" | "review_view" | "video_view" | "guide_view" | "save" | "place_click" | "content_impression" | "content_click" | "helpful_vote" | "video_complete" | "collab_cta_click" | "premium_lock_view" | "upgrade_cta_click";
    contentType?: "review" | "video" | "guide";
    contentId?: string;
    city?: string;
    category?: string;
    source?: "feed" | "discovery" | "place" | "profile" | "external";
    happenedAt: string;
}
export interface CreatorAnalyticsOverview {
    profileViews: number;
    followerGrowth: number;
    reviewViews: number;
    videoViews: number;
    guideViews: number;
    saves: number;
    placeClicks: number;
    impressions: number;
    helpfulVotes: number;
    completionRate: number;
    byContentType: Record<string, number>;
    topCities: Array<{
        city: string;
        views: number;
    }>;
    topCategories: Array<{
        category: string;
        views: number;
    }>;
    topContent: Array<{
        contentId: string;
        views: number;
        contentType?: string;
    }>;
}
export interface CreatorAudienceBreakdown {
    byCity: Array<{
        city: string;
        count: number;
    }>;
    byCategory: Array<{
        category: string;
        count: number;
    }>;
    bySource: Array<{
        source: string;
        count: number;
    }>;
}
export interface CreatorDiscoverabilityDecision {
    eligible: boolean;
    score: number;
    reasons: string[];
    candidatePools: string[];
}
export interface CreatorBrandingSettings {
    creatorProfileId: string;
    coverImageUrl?: string;
    accentColor?: string;
    featuredIntroVideoUrl?: string;
    featuredGuideId?: string;
    featuredContentIds: string[];
    tagline?: string;
    specialties: string[];
    collaborationCtaLabel?: string;
    links: Array<{
        label: string;
        url: string;
    }>;
    updatedAt: string;
}
export interface CreatorMonetizationControls {
    creatorProfileId: string;
    tipsEnabled: boolean;
    premiumContentGatingEnabled: boolean;
    monetizedVideoEnabled: boolean;
    monetizedGuidesEnabled: boolean;
    collaborationInquiriesOpen: boolean;
    businessContactEmail?: string;
    sponsoredContentLabelRequired: boolean;
    payoutReadinessStatus: "not_started" | "pending" | "ready" | "blocked";
    updatedAt: string;
}
export interface CreatorUpgradeContext {
    creatorProfileId: string;
    currentTier: CreatorTier;
    missingEntitlements: CreatorEntitlementKey[];
    nextRecommendedTier: Exclude<CreatorTier, "standard">;
    copy: string;
}
export interface CreatorPremiumStore {
    getBranding(creatorProfileId: string): CreatorBrandingSettings | undefined;
    saveBranding(settings: CreatorBrandingSettings): void;
    getMonetizationControls(creatorProfileId: string): CreatorMonetizationControls | undefined;
    saveMonetizationControls(settings: CreatorMonetizationControls): void;
    addAnalyticsEvent(event: CreatorAnalyticsEvent): void;
    listAnalyticsEvents(creatorProfileId: string): CreatorAnalyticsEvent[];
    incrementQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey, amount: number): number;
    getQuotaUsage(creatorProfileId: string, key: CreatorQuotaKey): number;
}
export interface CreatorPremiumDeps {
    getCreatorProfile(creatorProfileId: string): CreatorProfile | undefined;
}
