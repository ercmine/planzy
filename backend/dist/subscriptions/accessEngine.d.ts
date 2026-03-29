import type { SubscriptionService } from "./service.js";
import { SubscriptionTargetType } from "./types.js";
export declare const FEATURE_KEYS: {
    readonly UPLOAD_PHOTOS: "upload.photos";
    readonly UPLOAD_VIDEOS: "upload.videos";
    readonly REVIEWS_WRITE: "reviews.write";
    readonly REVIEWS_VIDEO_WRITE: "reviews.video_write";
    readonly REVIEWS_EDIT_AFTER_PUBLISH: "reviews.edit_after_publish";
    readonly REVIEWS_REPLY_AS_BUSINESS: "reviews.reply_as_business";
    readonly AI_PLACE_SUMMARY: "ai.place_summary";
    readonly AI_TRIP_ASSISTANT: "ai.trip_assistant";
    readonly AI_CATEGORY_SUGGESTIONS: "ai.category_suggestions";
    readonly CONTENT_PREMIUM_ACCESS: "content.premium_access";
    readonly SEARCH_ADVANCED_FILTERS: "search.advanced_filters";
    readonly PLACES_MULTI_PHOTO_DETAIL_VIEW: "places.multi_photo_detail_view";
    readonly CREATOR_PROFILE_ENABLED: "creator.profile_enabled";
    readonly CREATOR_ANALYTICS_BASIC: "creator.analytics_basic";
    readonly CREATOR_ANALYTICS_ADVANCED: "creator.analytics_advanced";
    readonly CREATOR_PRIORITY_DISTRIBUTION: "creator.priority_distribution";
    readonly BUSINESS_PROFILE_ENABLED: "business.profile_enabled";
    readonly BUSINESS_LEAD_TOOLS: "business.lead_tools";
    readonly BUSINESS_PROMOTED_PLACEMENT: "business.promoted_placement";
    readonly BUSINESS_ANALYTICS_BASIC: "business.analytics_basic";
    readonly BUSINESS_ANALYTICS_ADVANCED: "business.analytics_advanced";
    readonly ADS_AD_FREE: "ads.ad_free";
    readonly MODERATION_PRIORITY_QUEUE: "moderation.priority_queue";
    readonly LISTS_SAVE_PLACES: "lists.save_places";
    readonly LISTS_CREATE_CUSTOM: "lists.create_custom";
    readonly LISTS_CREATE_PUBLIC: "lists.create_public";
    readonly GUIDES_CREATE: "guides.create";
    readonly GUIDES_ITINERARIES: "guides.itineraries";
    readonly GUIDES_ATTACH_VIDEO: "guides.attach_video";
    readonly GUIDES_DISCOVERY: "guides.discovery";
    readonly GUIDES_PLACE_SURFACING: "guides.place_surfacing";
    readonly CREATOR_TIPS_ENABLED: "creator.tips_enabled";
    readonly CREATOR_PREMIUM_CONTENT_ENABLED: "creator.premium_content_enabled";
    readonly CREATOR_FEATURED_ELIGIBILITY: "creator.featured_eligibility";
    readonly CREATOR_EXTENDED_UPLOAD_LIMITS: "creator.extended_upload_limits";
    readonly CREATOR_MEMBERSHIP_HOOKS: "creator.membership_hooks";
    readonly CREATOR_PREMIUM_ANALYTICS: "creator.premium_analytics";
    readonly CREATOR_VIDEO_EXTENDED_LIMITS: "creator.video_extended_limits";
};
export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];
export declare const QUOTA_KEYS: {
    readonly UPLOAD_PHOTOS_PER_PLACE: "quota.upload.photos_per_place";
    readonly UPLOAD_PHOTOS_PER_MONTH: "quota.upload.photos_per_month";
    readonly UPLOAD_VIDEOS_PER_MONTH: "quota.upload.videos_per_month";
    readonly UPLOAD_VIDEO_DURATION_SECONDS: "quota.upload.video_duration_seconds";
    readonly UPLOAD_VIDEO_SIZE_MB: "quota.upload.video_size_mb";
    readonly LISTS_SAVED_LISTS: "quota.lists.saved_lists";
    readonly LISTS_ITEMS_PER_LIST: "quota.lists.items_per_list";
    readonly LISTS_TOTAL_SAVED_PLACES: "quota.lists.total_saved_places";
    readonly AI_REQUESTS_PER_DAY: "quota.ai.requests_per_day";
    readonly AI_REQUESTS_PER_MONTH: "quota.ai.requests_per_month";
    readonly REVIEWS_WRITE_PER_DAY: "quota.reviews.write_per_day";
    readonly REVIEWS_WRITE_PER_MONTH: "quota.reviews.write_per_month";
    readonly REVIEWS_VIDEO_PER_MONTH: "quota.reviews.video_per_month";
    readonly CONTENT_PREMIUM_VIEWS_PER_MONTH: "quota.content.premium_views_per_month";
    readonly CREATOR_FEATURED_SUBMISSIONS_PER_MONTH: "quota.creator.featured_submissions_per_month";
    readonly BUSINESS_TEAM_MEMBERS: "quota.business.team_members";
    readonly BUSINESS_PROMOTED_PLACES: "quota.business.promoted_places";
    readonly BUSINESS_CAMPAIGNS_PER_MONTH: "quota.business.campaigns_per_month";
    readonly GUIDES_PER_CREATOR: "quota.guides.per_creator";
    readonly GUIDE_PLACES_PER_GUIDE: "quota.guides.places_per_guide";
    readonly CREATOR_PREMIUM_GUIDES_PER_MONTH: "quota.creator.premium_guides_per_month";
    readonly CREATOR_PUBLISHES_PER_MONTH: "quota.creator.publishes_per_month";
};
export type QuotaKey = typeof QUOTA_KEYS[keyof typeof QUOTA_KEYS];
export declare enum QuotaResetWindow {
    NONE = "NONE",
    DAILY = "DAILY",
    MONTHLY = "MONTHLY",
    BILLING_PERIOD = "BILLING_PERIOD",
    LIFETIME = "LIFETIME"
}
export type AccessDenialReason = "feature_disabled" | "not_in_plan" | "no_active_subscription" | "wrong_target_type" | "quota_exceeded" | "daily_limit_reached" | "monthly_limit_reached" | "billing_period_limit_reached" | "premium_access_required" | "review_privilege_required" | "creator_plan_required" | "business_plan_required" | "upload_limit_reached" | "video_limit_reached" | "ai_limit_reached" | "list_limit_reached" | "moderation_hold" | "admin_disabled" | "premium_view_limit_reached" | "wrong_profile_type";
export interface AccessTarget {
    targetType: SubscriptionTargetType;
    targetId: string;
}
export interface EffectiveFeatureSet {
    target: AccessTarget;
    features: Record<FeatureKey, boolean>;
    sourcePlan: string;
    sources: Record<FeatureKey, "default" | "plan" | "flag" | "override" | "fallback_free" | "hard_disable">;
    evaluatedAt: string;
}
export interface EffectiveQuotaItem {
    key: QuotaKey;
    limit: number;
    resetWindow: QuotaResetWindow;
    unit: "count" | "seconds" | "mb";
    source: "default" | "plan" | "override" | "fallback_free";
}
export interface AccessDecision {
    allowed: boolean;
    targetType: SubscriptionTargetType;
    targetId: string;
    featureKey?: FeatureKey;
    quotaKey?: QuotaKey;
    currentUsage?: number;
    limit?: number;
    remaining?: number;
    resetAt?: string;
    denialReason?: AccessDenialReason;
    messageCode: string;
    sourcePlan: string;
    sourceOverride?: string;
}
export type PremiumContentVisibility = "free" | "premium" | "creator_only" | "business_only" | "plan_gated";
export interface PremiumContentDescriptor {
    contentId: string;
    visibility: PremiumContentVisibility;
    requiredPlanIds?: string[];
}
export interface AccessOverride {
    targetType: SubscriptionTargetType;
    targetId: string;
    hardDisabledFeatures?: FeatureKey[];
    grantedFeatures?: FeatureKey[];
    quotaOverrides?: Partial<Record<QuotaKey, number>>;
    expiresAt?: string;
    reason?: string;
}
interface UsageRow {
    targetType: SubscriptionTargetType;
    targetId: string;
    quotaKey: QuotaKey;
    usageAmount: number;
    periodStart: string;
    periodEnd?: string;
    lastUpdatedAt: string;
}
export declare class MemoryAccessUsageStore {
    private readonly rows;
    get(target: AccessTarget, quotaKey: QuotaKey, periodStart: string): Promise<UsageRow | undefined>;
    increment(target: AccessTarget, quotaKey: QuotaKey, periodStart: string, periodEnd: string | undefined, amount: number, now: Date): Promise<UsageRow>;
    list(target: AccessTarget): Promise<UsageRow[]>;
    private key;
}
export declare class FeatureQuotaEngine {
    private readonly subscriptions;
    private readonly usage;
    private readonly overrides;
    constructor(subscriptions: SubscriptionService, usage?: MemoryAccessUsageStore);
    addOverride(override: AccessOverride): void;
    resolveFeatureSet(target: AccessTarget, now?: Date): EffectiveFeatureSet;
    resolveQuotaSet(target: AccessTarget, now?: Date): Record<QuotaKey, EffectiveQuotaItem>;
    checkFeatureAccess(target: AccessTarget, featureKey: FeatureKey, now?: Date): Promise<AccessDecision>;
    getUsage(target: AccessTarget, quotaKey: QuotaKey, now?: Date, billingPeriodStart?: string): Promise<{
        used: number;
        periodStart: string;
    }>;
    checkQuotaAccess(target: AccessTarget, quotaKey: QuotaKey, amount?: number, now?: Date, billingPeriodStart?: string): Promise<AccessDecision>;
    consumeQuota(target: AccessTarget, quotaKey: QuotaKey, amount?: number, now?: Date, billingPeriodStart?: string): Promise<AccessDecision>;
    checkAndConsumeQuota(target: AccessTarget, quotaKey: QuotaKey, amount?: number, now?: Date, billingPeriodStart?: string): Promise<AccessDecision>;
    checkPremiumContentAccess(target: AccessTarget, content: PremiumContentDescriptor, now?: Date): Promise<AccessDecision>;
    getFeatureAccessSummary(target: AccessTarget, now?: Date): Promise<{
        target: AccessTarget;
        sourcePlan: string;
        features: Array<{
            key: FeatureKey;
            enabled: boolean;
            source: string;
        }>;
    }>;
    getQuotaSummary(target: AccessTarget, now?: Date): Promise<{
        target: AccessTarget;
        quotas: Array<{
            key: QuotaKey;
            limit: number;
            used: number;
            remaining: number;
            resetAt?: string;
            source: string;
        }>;
    }>;
    private activeOverrides;
    private denialForQuota;
}
export {};
