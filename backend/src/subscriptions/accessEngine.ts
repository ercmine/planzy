import { getFreePlan, getPlan } from "./catalog.js";
import type { SubscriptionService } from "./service.js";
import { SubscriptionTargetType, type EntitlementValue, type PlanDefinition } from "./types.js";

export const FEATURE_KEYS = {
  UPLOAD_PHOTOS: "upload.photos",
  UPLOAD_VIDEOS: "upload.videos",
  REVIEWS_WRITE: "reviews.write",
  REVIEWS_VIDEO_WRITE: "reviews.video_write",
  REVIEWS_EDIT_AFTER_PUBLISH: "reviews.edit_after_publish",
  REVIEWS_REPLY_AS_BUSINESS: "reviews.reply_as_business",
  AI_PLACE_SUMMARY: "ai.place_summary",
  AI_TRIP_ASSISTANT: "ai.trip_assistant",
  AI_CATEGORY_SUGGESTIONS: "ai.category_suggestions",
  CONTENT_PREMIUM_ACCESS: "content.premium_access",
  SEARCH_ADVANCED_FILTERS: "search.advanced_filters",
  PLACES_MULTI_PHOTO_DETAIL_VIEW: "places.multi_photo_detail_view",
  CREATOR_PROFILE_ENABLED: "creator.profile_enabled",
  CREATOR_ANALYTICS_BASIC: "creator.analytics_basic",
  CREATOR_ANALYTICS_ADVANCED: "creator.analytics_advanced",
  CREATOR_PRIORITY_DISTRIBUTION: "creator.priority_distribution",
  BUSINESS_PROFILE_ENABLED: "business.profile_enabled",
  BUSINESS_LEAD_TOOLS: "business.lead_tools",
  BUSINESS_PROMOTED_PLACEMENT: "business.promoted_placement",
  BUSINESS_ANALYTICS_BASIC: "business.analytics_basic",
  BUSINESS_ANALYTICS_ADVANCED: "business.analytics_advanced",
  ADS_AD_FREE: "ads.ad_free",
  MODERATION_PRIORITY_QUEUE: "moderation.priority_queue",
  LISTS_SAVE_PLACES: "lists.save_places",
  LISTS_CREATE_CUSTOM: "lists.create_custom",
  LISTS_CREATE_PUBLIC: "lists.create_public"
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export const QUOTA_KEYS = {
  UPLOAD_PHOTOS_PER_PLACE: "quota.upload.photos_per_place",
  UPLOAD_PHOTOS_PER_MONTH: "quota.upload.photos_per_month",
  UPLOAD_VIDEOS_PER_MONTH: "quota.upload.videos_per_month",
  UPLOAD_VIDEO_DURATION_SECONDS: "quota.upload.video_duration_seconds",
  UPLOAD_VIDEO_SIZE_MB: "quota.upload.video_size_mb",
  LISTS_SAVED_LISTS: "quota.lists.saved_lists",
  LISTS_ITEMS_PER_LIST: "quota.lists.items_per_list",
  LISTS_TOTAL_SAVED_PLACES: "quota.lists.total_saved_places",
  AI_REQUESTS_PER_DAY: "quota.ai.requests_per_day",
  AI_REQUESTS_PER_MONTH: "quota.ai.requests_per_month",
  REVIEWS_WRITE_PER_DAY: "quota.reviews.write_per_day",
  REVIEWS_WRITE_PER_MONTH: "quota.reviews.write_per_month",
  REVIEWS_VIDEO_PER_MONTH: "quota.reviews.video_per_month",
  CONTENT_PREMIUM_VIEWS_PER_MONTH: "quota.content.premium_views_per_month",
  CREATOR_FEATURED_SUBMISSIONS_PER_MONTH: "quota.creator.featured_submissions_per_month",
  BUSINESS_TEAM_MEMBERS: "quota.business.team_members",
  BUSINESS_PROMOTED_PLACES: "quota.business.promoted_places",
  BUSINESS_CAMPAIGNS_PER_MONTH: "quota.business.campaigns_per_month"
} as const;

export type QuotaKey = typeof QUOTA_KEYS[keyof typeof QUOTA_KEYS];

export enum QuotaResetWindow {
  NONE = "NONE",
  DAILY = "DAILY",
  MONTHLY = "MONTHLY",
  BILLING_PERIOD = "BILLING_PERIOD",
  LIFETIME = "LIFETIME"
}

export type AccessDenialReason =
  | "feature_disabled"
  | "not_in_plan"
  | "no_active_subscription"
  | "wrong_target_type"
  | "quota_exceeded"
  | "daily_limit_reached"
  | "monthly_limit_reached"
  | "billing_period_limit_reached"
  | "premium_access_required"
  | "review_privilege_required"
  | "creator_plan_required"
  | "business_plan_required"
  | "upload_limit_reached"
  | "video_limit_reached"
  | "ai_limit_reached"
  | "list_limit_reached"
  | "moderation_hold"
  | "admin_disabled"
  | "premium_view_limit_reached"
  | "wrong_profile_type";

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

const FEATURE_DEFAULTS = Object.freeze(Object.values(FEATURE_KEYS).reduce<Record<FeatureKey, boolean>>((acc, key) => {
  acc[key] = false;
  return acc;
}, {} as Record<FeatureKey, boolean>));

const QUOTA_DEFAULTS: Record<QuotaKey, { limit: number; resetWindow: QuotaResetWindow; unit: EffectiveQuotaItem["unit"] }> = {
  [QUOTA_KEYS.UPLOAD_PHOTOS_PER_PLACE]: { limit: 3, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.UPLOAD_PHOTOS_PER_MONTH]: { limit: 20, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.UPLOAD_VIDEOS_PER_MONTH]: { limit: 0, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.UPLOAD_VIDEO_DURATION_SECONDS]: { limit: 0, resetWindow: QuotaResetWindow.NONE, unit: "seconds" },
  [QUOTA_KEYS.UPLOAD_VIDEO_SIZE_MB]: { limit: 0, resetWindow: QuotaResetWindow.NONE, unit: "mb" },
  [QUOTA_KEYS.LISTS_SAVED_LISTS]: { limit: 5, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.LISTS_ITEMS_PER_LIST]: { limit: 50, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES]: { limit: 50, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.AI_REQUESTS_PER_DAY]: { limit: 2, resetWindow: QuotaResetWindow.DAILY, unit: "count" },
  [QUOTA_KEYS.AI_REQUESTS_PER_MONTH]: { limit: 30, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.REVIEWS_WRITE_PER_DAY]: { limit: 5, resetWindow: QuotaResetWindow.DAILY, unit: "count" },
  [QUOTA_KEYS.REVIEWS_WRITE_PER_MONTH]: { limit: 30, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.REVIEWS_VIDEO_PER_MONTH]: { limit: 0, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.CONTENT_PREMIUM_VIEWS_PER_MONTH]: { limit: 0, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.CREATOR_FEATURED_SUBMISSIONS_PER_MONTH]: { limit: 0, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" },
  [QUOTA_KEYS.BUSINESS_TEAM_MEMBERS]: { limit: 1, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.BUSINESS_PROMOTED_PLACES]: { limit: 0, resetWindow: QuotaResetWindow.NONE, unit: "count" },
  [QUOTA_KEYS.BUSINESS_CAMPAIGNS_PER_MONTH]: { limit: 0, resetWindow: QuotaResetWindow.MONTHLY, unit: "count" }
};

interface UsageRow {
  targetType: SubscriptionTargetType;
  targetId: string;
  quotaKey: QuotaKey;
  usageAmount: number;
  periodStart: string;
  periodEnd?: string;
  lastUpdatedAt: string;
}

export class MemoryAccessUsageStore {
  private readonly rows = new Map<string, UsageRow>();

  async get(target: AccessTarget, quotaKey: QuotaKey, periodStart: string): Promise<UsageRow | undefined> {
    return this.rows.get(this.key(target, quotaKey, periodStart));
  }

  async increment(target: AccessTarget, quotaKey: QuotaKey, periodStart: string, periodEnd: string | undefined, amount: number, now: Date): Promise<UsageRow> {
    const id = this.key(target, quotaKey, periodStart);
    const current = this.rows.get(id);
    const next: UsageRow = {
      targetType: target.targetType,
      targetId: target.targetId,
      quotaKey,
      usageAmount: (current?.usageAmount ?? 0) + amount,
      periodStart,
      periodEnd,
      lastUpdatedAt: now.toISOString()
    };
    this.rows.set(id, next);
    return next;
  }

  async list(target: AccessTarget): Promise<UsageRow[]> {
    return [...this.rows.values()].filter((row) => row.targetId === target.targetId && row.targetType === target.targetType);
  }

  private key(target: AccessTarget, quotaKey: QuotaKey, periodStart: string): string {
    return `${target.targetType}:${target.targetId}:${quotaKey}:${periodStart}`;
  }
}

function planFeatureMapping(plan: PlanDefinition, entitlements: Record<string, EntitlementValue>): Record<FeatureKey, boolean> {
  return {
    ...FEATURE_DEFAULTS,
    [FEATURE_KEYS.UPLOAD_PHOTOS]: true,
    [FEATURE_KEYS.UPLOAD_VIDEOS]: Number(entitlements.max_video_reviews_per_month ?? 0) > 0,
    [FEATURE_KEYS.REVIEWS_WRITE]: Number(entitlements.max_text_reviews_per_month ?? 0) > 0,
    [FEATURE_KEYS.REVIEWS_VIDEO_WRITE]: Number(entitlements.max_video_reviews_per_month ?? 0) > 0,
    [FEATURE_KEYS.REVIEWS_EDIT_AFTER_PUBLISH]: plan.tier !== "FREE",
    [FEATURE_KEYS.REVIEWS_REPLY_AS_BUSINESS]: Boolean(entitlements.business_reply_to_reviews),
    [FEATURE_KEYS.AI_PLACE_SUMMARY]: Boolean(entitlements.ai_recommendations),
    [FEATURE_KEYS.AI_TRIP_ASSISTANT]: Boolean(entitlements.ai_itinerary_generation),
    [FEATURE_KEYS.AI_CATEGORY_SUGGESTIONS]: Boolean(entitlements.ai_recommendations),
    [FEATURE_KEYS.CONTENT_PREMIUM_ACCESS]: !Boolean(entitlements.ads_enabled),
    [FEATURE_KEYS.SEARCH_ADVANCED_FILTERS]: Boolean(entitlements.advanced_search),
    [FEATURE_KEYS.PLACES_MULTI_PHOTO_DETAIL_VIEW]: plan.tier !== "FREE",
    [FEATURE_KEYS.CREATOR_PROFILE_ENABLED]: Boolean(entitlements.creator_profile_enabled),
    [FEATURE_KEYS.CREATOR_ANALYTICS_BASIC]: Boolean(entitlements.creator_analytics),
    [FEATURE_KEYS.CREATOR_ANALYTICS_ADVANCED]: Boolean(entitlements.creator_analytics) && plan.tier === "ELITE",
    [FEATURE_KEYS.CREATOR_PRIORITY_DISTRIBUTION]: Boolean(entitlements.can_receive_priority_ranking),
    [FEATURE_KEYS.BUSINESS_PROFILE_ENABLED]: Boolean(entitlements.business_claiming_enabled),
    [FEATURE_KEYS.BUSINESS_LEAD_TOOLS]: Boolean(entitlements.business_promotions),
    [FEATURE_KEYS.BUSINESS_PROMOTED_PLACEMENT]: Boolean(entitlements.can_purchase_promotions),
    [FEATURE_KEYS.BUSINESS_ANALYTICS_BASIC]: Boolean(entitlements.business_analytics),
    [FEATURE_KEYS.BUSINESS_ANALYTICS_ADVANCED]: Boolean(entitlements.business_analytics) && plan.tier === "ELITE",
    [FEATURE_KEYS.ADS_AD_FREE]: !Boolean(entitlements.ads_enabled),
    [FEATURE_KEYS.MODERATION_PRIORITY_QUEUE]: Boolean(entitlements.priority_support),
    [FEATURE_KEYS.LISTS_SAVE_PLACES]: Number(entitlements.max_saved_places ?? 0) > 0,
    [FEATURE_KEYS.LISTS_CREATE_CUSTOM]: Number(entitlements.max_custom_lists ?? 0) > 0,
    [FEATURE_KEYS.LISTS_CREATE_PUBLIC]: !Boolean(entitlements.ads_enabled)
  };
}

function planQuotaMapping(entitlements: Record<string, EntitlementValue>): Record<QuotaKey, number> {
  return {
    [QUOTA_KEYS.UPLOAD_PHOTOS_PER_PLACE]: Number(entitlements.max_photo_uploads_per_review ?? QUOTA_DEFAULTS[QUOTA_KEYS.UPLOAD_PHOTOS_PER_PLACE].limit),
    [QUOTA_KEYS.UPLOAD_PHOTOS_PER_MONTH]: Number(entitlements.max_photo_reviews_per_month ?? QUOTA_DEFAULTS[QUOTA_KEYS.UPLOAD_PHOTOS_PER_MONTH].limit),
    [QUOTA_KEYS.UPLOAD_VIDEOS_PER_MONTH]: Number(entitlements.max_video_reviews_per_month ?? QUOTA_DEFAULTS[QUOTA_KEYS.UPLOAD_VIDEOS_PER_MONTH].limit),
    [QUOTA_KEYS.UPLOAD_VIDEO_DURATION_SECONDS]: Number(entitlements.max_video_duration_seconds ?? QUOTA_DEFAULTS[QUOTA_KEYS.UPLOAD_VIDEO_DURATION_SECONDS].limit),
    [QUOTA_KEYS.UPLOAD_VIDEO_SIZE_MB]: Number(entitlements.max_video_duration_seconds ? 250 : QUOTA_DEFAULTS[QUOTA_KEYS.UPLOAD_VIDEO_SIZE_MB].limit),
    [QUOTA_KEYS.LISTS_SAVED_LISTS]: Number(entitlements.max_custom_lists ?? QUOTA_DEFAULTS[QUOTA_KEYS.LISTS_SAVED_LISTS].limit),
    [QUOTA_KEYS.LISTS_ITEMS_PER_LIST]: Number(entitlements.max_places_per_list ?? entitlements.max_saved_places ?? QUOTA_DEFAULTS[QUOTA_KEYS.LISTS_ITEMS_PER_LIST].limit),
    [QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES]: Number(entitlements.max_saved_places ?? QUOTA_DEFAULTS[QUOTA_KEYS.LISTS_TOTAL_SAVED_PLACES].limit),
    [QUOTA_KEYS.AI_REQUESTS_PER_DAY]: Number(entitlements.ai_itinerary_generation ? 40 : entitlements.ai_recommendations ? 10 : QUOTA_DEFAULTS[QUOTA_KEYS.AI_REQUESTS_PER_DAY].limit),
    [QUOTA_KEYS.AI_REQUESTS_PER_MONTH]: Number(entitlements.ai_itinerary_generation ? 600 : entitlements.ai_recommendations ? 150 : QUOTA_DEFAULTS[QUOTA_KEYS.AI_REQUESTS_PER_MONTH].limit),
    [QUOTA_KEYS.REVIEWS_WRITE_PER_DAY]: Number(entitlements.max_text_reviews_per_month ? 20 : QUOTA_DEFAULTS[QUOTA_KEYS.REVIEWS_WRITE_PER_DAY].limit),
    [QUOTA_KEYS.REVIEWS_WRITE_PER_MONTH]: Number(entitlements.max_text_reviews_per_month ?? QUOTA_DEFAULTS[QUOTA_KEYS.REVIEWS_WRITE_PER_MONTH].limit),
    [QUOTA_KEYS.REVIEWS_VIDEO_PER_MONTH]: Number(entitlements.max_video_reviews_per_month ?? QUOTA_DEFAULTS[QUOTA_KEYS.REVIEWS_VIDEO_PER_MONTH].limit),
    [QUOTA_KEYS.CONTENT_PREMIUM_VIEWS_PER_MONTH]: Number(entitlements.ads_enabled ? 0 : 100),
    [QUOTA_KEYS.CREATOR_FEATURED_SUBMISSIONS_PER_MONTH]: Number(entitlements.max_featured_posts ?? QUOTA_DEFAULTS[QUOTA_KEYS.CREATOR_FEATURED_SUBMISSIONS_PER_MONTH].limit),
    [QUOTA_KEYS.BUSINESS_TEAM_MEMBERS]: Number(entitlements.business_team_members ?? QUOTA_DEFAULTS[QUOTA_KEYS.BUSINESS_TEAM_MEMBERS].limit),
    [QUOTA_KEYS.BUSINESS_PROMOTED_PLACES]: Number(entitlements.max_places_claimed ?? QUOTA_DEFAULTS[QUOTA_KEYS.BUSINESS_PROMOTED_PLACES].limit),
    [QUOTA_KEYS.BUSINESS_CAMPAIGNS_PER_MONTH]: Number(entitlements.business_promotions ? 10 : QUOTA_DEFAULTS[QUOTA_KEYS.BUSINESS_CAMPAIGNS_PER_MONTH].limit)
  };
}

function toPeriodStart(window: QuotaResetWindow, now: Date, billingPeriodStart?: string): string {
  if (window === QuotaResetWindow.DAILY) return now.toISOString().slice(0, 10);
  if (window === QuotaResetWindow.MONTHLY) return now.toISOString().slice(0, 7);
  if (window === QuotaResetWindow.BILLING_PERIOD) return billingPeriodStart ?? now.toISOString().slice(0, 7);
  if (window === QuotaResetWindow.LIFETIME) return "lifetime";
  return "none";
}

function toResetAt(window: QuotaResetWindow, now: Date): string | undefined {
  if (window === QuotaResetWindow.DAILY) {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    return next.toISOString();
  }
  if (window === QuotaResetWindow.MONTHLY) {
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toISOString();
  }
  return undefined;
}

export class FeatureQuotaEngine {
  private readonly overrides = new Map<string, AccessOverride[]>();

  constructor(private readonly subscriptions: SubscriptionService, private readonly usage: MemoryAccessUsageStore = new MemoryAccessUsageStore()) {}

  addOverride(override: AccessOverride): void {
    const key = `${override.targetType}:${override.targetId}`;
    this.overrides.set(key, [...(this.overrides.get(key) ?? []), override]);
  }

  resolveFeatureSet(target: AccessTarget, now = new Date()): EffectiveFeatureSet {
    this.subscriptions.ensureAccount(target.targetId, target.targetType);
    const bundle = this.subscriptions.getCurrentEntitlements(target.targetId);
    const plan = getPlan(bundle.planId) ?? getFreePlan(target.targetType);

    const features = planFeatureMapping(plan, bundle.values as Record<string, EntitlementValue>);
    const sources = Object.values(FEATURE_KEYS).reduce<EffectiveFeatureSet["sources"]>((acc, key) => {
      acc[key] = plan.id === bundle.planId ? "plan" : "fallback_free";
      return acc;
    }, {} as EffectiveFeatureSet["sources"]);

    for (const override of this.activeOverrides(target, now)) {
      for (const key of override.grantedFeatures ?? []) {
        features[key] = true;
        sources[key] = "override";
      }
      for (const key of override.hardDisabledFeatures ?? []) {
        features[key] = false;
        sources[key] = "hard_disable";
      }
    }

    return {
      target,
      features,
      sourcePlan: plan.id,
      sources,
      evaluatedAt: now.toISOString()
    };
  }

  resolveQuotaSet(target: AccessTarget, now = new Date()): Record<QuotaKey, EffectiveQuotaItem> {
    this.subscriptions.ensureAccount(target.targetId, target.targetType);
    const bundle = this.subscriptions.getCurrentEntitlements(target.targetId);
    const plan = getPlan(bundle.planId) ?? getFreePlan(target.targetType);
    const limits = planQuotaMapping(bundle.values as Record<string, EntitlementValue>);

    const result = Object.values(QUOTA_KEYS).reduce<Record<QuotaKey, EffectiveQuotaItem>>((acc, key) => {
      acc[key] = {
        key,
        limit: Number.isFinite(limits[key]) ? limits[key] : QUOTA_DEFAULTS[key].limit,
        resetWindow: QUOTA_DEFAULTS[key].resetWindow,
        unit: QUOTA_DEFAULTS[key].unit,
        source: plan.id === bundle.planId ? "plan" : "fallback_free"
      };
      return acc;
    }, {} as Record<QuotaKey, EffectiveQuotaItem>);

    for (const override of this.activeOverrides(target, now)) {
      for (const [key, value] of Object.entries(override.quotaOverrides ?? {}) as Array<[QuotaKey, number]>) {
        const current = result[key];
        if (!current) continue;
        current.limit = value;
        current.source = "override";
      }
    }

    return result;
  }

  async checkFeatureAccess(target: AccessTarget, featureKey: FeatureKey, now = new Date()): Promise<AccessDecision> {
    const featureSet = this.resolveFeatureSet(target, now);
    if (featureSet.features[featureKey]) {
      return { allowed: true, targetType: target.targetType, targetId: target.targetId, featureKey, messageCode: "allowed", sourcePlan: featureSet.sourcePlan };
    }
    return { allowed: false, targetType: target.targetType, targetId: target.targetId, featureKey, denialReason: featureSet.sources[featureKey] === "hard_disable" ? "admin_disabled" : "feature_disabled", messageCode: "feature_disabled", sourcePlan: featureSet.sourcePlan };
  }

  async getUsage(target: AccessTarget, quotaKey: QuotaKey, now = new Date(), billingPeriodStart?: string): Promise<{ used: number; periodStart: string }> {
    const quota = this.resolveQuotaSet(target, now)[quotaKey];
    const periodStart = toPeriodStart(quota.resetWindow, now, billingPeriodStart);
    const row = await this.usage.get(target, quotaKey, periodStart);
    return { used: row?.usageAmount ?? 0, periodStart };
  }

  async checkQuotaAccess(target: AccessTarget, quotaKey: QuotaKey, amount = 1, now = new Date(), billingPeriodStart?: string): Promise<AccessDecision> {
    const quota = this.resolveQuotaSet(target, now)[quotaKey];
    const { used } = await this.getUsage(target, quotaKey, now, billingPeriodStart);
    const remaining = Math.max(0, quota.limit - used);
    const allowed = used + amount <= quota.limit;

    return {
      allowed,
      targetType: target.targetType,
      targetId: target.targetId,
      quotaKey,
      currentUsage: used,
      limit: quota.limit,
      remaining,
      resetAt: toResetAt(quota.resetWindow, now),
      denialReason: allowed ? undefined : this.denialForQuota(quotaKey, quota.resetWindow),
      messageCode: allowed ? "allowed" : "quota_exceeded",
      sourcePlan: this.subscriptions.getSubscription(target.targetId).planId
    };
  }

  async consumeQuota(target: AccessTarget, quotaKey: QuotaKey, amount = 1, now = new Date(), billingPeriodStart?: string): Promise<AccessDecision> {
    const check = await this.checkQuotaAccess(target, quotaKey, amount, now, billingPeriodStart);
    if (!check.allowed) return check;

    const quota = this.resolveQuotaSet(target, now)[quotaKey];
    const periodStart = toPeriodStart(quota.resetWindow, now, billingPeriodStart);
    const periodEnd = toResetAt(quota.resetWindow, now);
    await this.usage.increment(target, quotaKey, periodStart, periodEnd, amount, now);
    return this.checkQuotaAccess(target, quotaKey, 0, now, billingPeriodStart);
  }

  async checkAndConsumeQuota(target: AccessTarget, quotaKey: QuotaKey, amount = 1, now = new Date(), billingPeriodStart?: string): Promise<AccessDecision> {
    return this.consumeQuota(target, quotaKey, amount, now, billingPeriodStart);
  }

  async checkPremiumContentAccess(target: AccessTarget, content: PremiumContentDescriptor, now = new Date()): Promise<AccessDecision> {
    const feature = await this.checkFeatureAccess(target, FEATURE_KEYS.CONTENT_PREMIUM_ACCESS, now);
    if (content.visibility === "free") return { ...feature, allowed: true, denialReason: undefined, messageCode: "allowed" };
    if (content.visibility === "creator_only" && target.targetType !== SubscriptionTargetType.CREATOR) {
      return { ...feature, allowed: false, denialReason: "wrong_profile_type", messageCode: "wrong_profile_type" };
    }
    if (content.visibility === "business_only" && target.targetType !== SubscriptionTargetType.BUSINESS) {
      return { ...feature, allowed: false, denialReason: "wrong_profile_type", messageCode: "wrong_profile_type" };
    }
    if (!feature.allowed) {
      return { ...feature, denialReason: "premium_access_required", messageCode: "premium_access_required" };
    }

    if (content.visibility === "plan_gated") {
      const planId = this.subscriptions.getSubscription(target.targetId).planId;
      if (content.requiredPlanIds && !content.requiredPlanIds.includes(planId)) {
        return { ...feature, allowed: false, denialReason: "not_in_plan", messageCode: "not_in_plan" };
      }
    }

    return this.checkQuotaAccess(target, QUOTA_KEYS.CONTENT_PREMIUM_VIEWS_PER_MONTH, 1, now);
  }

  async getFeatureAccessSummary(target: AccessTarget, now = new Date()): Promise<{ target: AccessTarget; sourcePlan: string; features: Array<{ key: FeatureKey; enabled: boolean; source: string }> }> {
    const resolved = this.resolveFeatureSet(target, now);
    return {
      target,
      sourcePlan: resolved.sourcePlan,
      features: Object.values(FEATURE_KEYS).map((key) => ({ key, enabled: resolved.features[key], source: resolved.sources[key] }))
    };
  }

  async getQuotaSummary(target: AccessTarget, now = new Date()): Promise<{ target: AccessTarget; quotas: Array<{ key: QuotaKey; limit: number; used: number; remaining: number; resetAt?: string; source: string }> }> {
    const quotas = this.resolveQuotaSet(target, now);
    const summary: Array<{ key: QuotaKey; limit: number; used: number; remaining: number; resetAt?: string; source: string }> = [];
    for (const key of Object.values(QUOTA_KEYS)) {
      const usage = await this.getUsage(target, key, now);
      summary.push({
        key,
        limit: quotas[key].limit,
        used: usage.used,
        remaining: Math.max(0, quotas[key].limit - usage.used),
        resetAt: toResetAt(quotas[key].resetWindow, now),
        source: quotas[key].source
      });
    }
    return { target, quotas: summary };
  }

  private activeOverrides(target: AccessTarget, now: Date): AccessOverride[] {
    const key = `${target.targetType}:${target.targetId}`;
    return (this.overrides.get(key) ?? []).filter((override) => !override.expiresAt || new Date(override.expiresAt).getTime() > now.getTime());
  }

  private denialForQuota(quotaKey: QuotaKey, resetWindow: QuotaResetWindow): AccessDenialReason {
    if (quotaKey.startsWith("quota.ai.")) return "ai_limit_reached";
    if (quotaKey.startsWith("quota.upload.videos") || quotaKey.includes("video_")) return "video_limit_reached";
    if (quotaKey.startsWith("quota.upload.")) return "upload_limit_reached";
    if (quotaKey.startsWith("quota.lists.")) return "list_limit_reached";
    if (quotaKey === QUOTA_KEYS.CONTENT_PREMIUM_VIEWS_PER_MONTH) return "premium_view_limit_reached";
    if (resetWindow === QuotaResetWindow.DAILY) return "daily_limit_reached";
    if (resetWindow === QuotaResetWindow.MONTHLY) return "monthly_limit_reached";
    if (resetWindow === QuotaResetWindow.BILLING_PERIOD) return "billing_period_limit_reached";
    return "quota_exceeded";
  }
}
