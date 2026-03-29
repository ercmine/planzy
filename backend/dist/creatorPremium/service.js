import { ValidationError } from "../plans/errors.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import { CREATOR_ENTITLEMENTS, CREATOR_QUOTAS } from "./types.js";
const TIER_ENTITLEMENTS = {
    standard: [],
    pro: [
        CREATOR_ENTITLEMENTS.ANALYTICS_ADVANCED,
        CREATOR_ENTITLEMENTS.MEDIA_EXPANDED_UPLOADS,
        CREATOR_ENTITLEMENTS.DISCOVERY_BOOST_ELIGIBLE,
        CREATOR_ENTITLEMENTS.PROFILE_BRANDING,
        CREATOR_ENTITLEMENTS.MONETIZATION_ENABLED,
        CREATOR_ENTITLEMENTS.GUIDES_PREMIUM_FORMATS,
        CREATOR_ENTITLEMENTS.COLLAB_ENHANCED,
        CREATOR_ENTITLEMENTS.INSIGHTS_AUDIENCE_BREAKDOWN
    ],
    elite: Object.values(CREATOR_ENTITLEMENTS)
};
const TIER_QUOTAS = {
    standard: {
        [CREATOR_QUOTAS.REVIEWS_PUBLISHED]: 120,
        [CREATOR_QUOTAS.PHOTOS_PER_REVIEW]: 6,
        [CREATOR_QUOTAS.VIDEOS_PER_MONTH]: 8,
        [CREATOR_QUOTAS.VIDEO_DURATION_SECONDS]: 90,
        [CREATOR_QUOTAS.VIDEO_SIZE_MB]: 250,
        [CREATOR_QUOTAS.GALLERY_SIZE]: 40,
        [CREATOR_QUOTAS.GUIDES_TOTAL]: 20,
        [CREATOR_QUOTAS.GUIDE_PLACES_PER_GUIDE]: 20,
        [CREATOR_QUOTAS.DRAFTS_TOTAL]: 50,
        [CREATOR_QUOTAS.PREMIUM_CONTENT_ITEMS]: 0,
        [CREATOR_QUOTAS.BRANDING_ASSETS]: 0
    },
    pro: {
        [CREATOR_QUOTAS.REVIEWS_PUBLISHED]: 500,
        [CREATOR_QUOTAS.PHOTOS_PER_REVIEW]: 16,
        [CREATOR_QUOTAS.VIDEOS_PER_MONTH]: 30,
        [CREATOR_QUOTAS.VIDEO_DURATION_SECONDS]: 300,
        [CREATOR_QUOTAS.VIDEO_SIZE_MB]: 1200,
        [CREATOR_QUOTAS.GALLERY_SIZE]: 120,
        [CREATOR_QUOTAS.GUIDES_TOTAL]: 80,
        [CREATOR_QUOTAS.GUIDE_PLACES_PER_GUIDE]: 60,
        [CREATOR_QUOTAS.DRAFTS_TOTAL]: 200,
        [CREATOR_QUOTAS.PREMIUM_CONTENT_ITEMS]: 40,
        [CREATOR_QUOTAS.BRANDING_ASSETS]: 8
    },
    elite: {
        [CREATOR_QUOTAS.REVIEWS_PUBLISHED]: 2500,
        [CREATOR_QUOTAS.PHOTOS_PER_REVIEW]: 30,
        [CREATOR_QUOTAS.VIDEOS_PER_MONTH]: 120,
        [CREATOR_QUOTAS.VIDEO_DURATION_SECONDS]: 900,
        [CREATOR_QUOTAS.VIDEO_SIZE_MB]: 2500,
        [CREATOR_QUOTAS.GALLERY_SIZE]: 300,
        [CREATOR_QUOTAS.GUIDES_TOTAL]: 300,
        [CREATOR_QUOTAS.GUIDE_PLACES_PER_GUIDE]: 120,
        [CREATOR_QUOTAS.DRAFTS_TOTAL]: 1000,
        [CREATOR_QUOTAS.PREMIUM_CONTENT_ITEMS]: 250,
        [CREATOR_QUOTAS.BRANDING_ASSETS]: 20
    }
};
export class CreatorPremiumService {
    store;
    subscriptions;
    deps;
    ensureCreatorAccount(creatorProfileId) {
        this.subscriptions.ensureAccount(creatorProfileId, SubscriptionTargetType.CREATOR);
    }
    constructor(store, subscriptions, deps) {
        this.store = store;
        this.subscriptions = subscriptions;
        this.deps = deps;
    }
    getCreatorTier(creatorProfileId) {
        this.ensureCreatorAccount(creatorProfileId);
        const ent = this.subscriptions.getCurrentEntitlements(creatorProfileId).values;
        if (Boolean(ent.creator_priority_review_support) || Boolean(ent.creator_video_extended_limits))
            return "elite";
        if (Boolean(ent.creator_monetization_tools) || Boolean(ent.creator_premium_analytics) || Boolean(ent.creator_extended_upload_limits))
            return "pro";
        return "standard";
    }
    getCreatorPremiumState(creatorProfileId) {
        const tier = this.getCreatorTier(creatorProfileId);
        const entitlements = Object.values(CREATOR_ENTITLEMENTS).reduce((acc, entitlement) => {
            acc[entitlement] = TIER_ENTITLEMENTS[tier].includes(entitlement);
            return acc;
        }, {});
        return { creatorProfileId, tier, entitlements, badges: tier === "standard" ? [] : [tier === "elite" ? "creator_elite" : "creator_pro"] };
    }
    hasCreatorEntitlement(creatorProfileId, entitlement) {
        return this.getCreatorPremiumState(creatorProfileId).entitlements[entitlement];
    }
    getCreatorQuota(creatorProfileId, key) {
        const tier = this.getCreatorTier(creatorProfileId);
        const limit = TIER_QUOTAS[tier][key];
        const usage = this.store.getQuotaUsage(creatorProfileId, key);
        return { key, limit, usage, remaining: Math.max(0, limit - usage) };
    }
    consumeQuota(creatorProfileId, key, amount = 1) {
        const current = this.getCreatorQuota(creatorProfileId, key);
        if (current.usage + amount > current.limit)
            throw new Error("CREATOR_QUOTA_EXCEEDED");
        this.store.incrementQuotaUsage(creatorProfileId, key, amount);
        return this.getCreatorQuota(creatorProfileId, key);
    }
    canAccessAdvancedCreatorAnalytics(creatorProfileId) {
        return this.hasCreatorEntitlement(creatorProfileId, CREATOR_ENTITLEMENTS.ANALYTICS_ADVANCED);
    }
    recordAnalyticsEvent(event) {
        this.store.addAnalyticsEvent(event);
    }
    getCreatorAnalyticsOverview(creatorProfileId) {
        const events = this.store.listAnalyticsEvents(creatorProfileId);
        const profileViews = events.filter((event) => event.eventType === "profile_view").length;
        const followerGrowth = events.filter((event) => event.eventType === "follow").length;
        const reviewViews = events.filter((event) => event.eventType === "review_view").length;
        const videoViews = events.filter((event) => event.eventType === "video_view").length;
        const guideViews = events.filter((event) => event.eventType === "guide_view").length;
        const saves = events.filter((event) => event.eventType === "save").length;
        const placeClicks = events.filter((event) => event.eventType === "place_click").length;
        const impressions = events.filter((event) => event.eventType === "content_impression").length;
        const helpfulVotes = events.filter((event) => event.eventType === "helpful_vote").length;
        const completions = events.filter((event) => event.eventType === "video_complete").length;
        const byContentType = {};
        const cityCounts = new Map();
        const categoryCounts = new Map();
        const contentCounts = new Map();
        for (const event of events) {
            if (event.contentType)
                byContentType[event.contentType] = (byContentType[event.contentType] ?? 0) + 1;
            if (event.city)
                cityCounts.set(event.city, (cityCounts.get(event.city) ?? 0) + 1);
            if (event.category)
                categoryCounts.set(event.category, (categoryCounts.get(event.category) ?? 0) + 1);
            if (event.contentId && ["review_view", "video_view", "guide_view"].includes(event.eventType)) {
                const current = contentCounts.get(event.contentId) ?? { views: 0, contentType: event.contentType };
                current.views += 1;
                contentCounts.set(event.contentId, current);
            }
        }
        return {
            profileViews,
            followerGrowth,
            reviewViews,
            videoViews,
            guideViews,
            saves,
            placeClicks,
            impressions,
            helpfulVotes,
            completionRate: videoViews === 0 ? 0 : Number((completions / videoViews).toFixed(3)),
            byContentType,
            topCities: [...cityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([city, views]) => ({ city, views })),
            topCategories: [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([category, views]) => ({ category, views })),
            topContent: [...contentCounts.entries()].sort((a, b) => b[1].views - a[1].views).slice(0, 10).map(([contentId, data]) => ({ contentId, views: data.views, contentType: data.contentType }))
        };
    }
    getCreatorAudienceBreakdown(creatorProfileId) {
        if (!this.hasCreatorEntitlement(creatorProfileId, CREATOR_ENTITLEMENTS.INSIGHTS_AUDIENCE_BREAKDOWN))
            throw new Error("CREATOR_ENTITLEMENT_REQUIRED");
        const events = this.store.listAnalyticsEvents(creatorProfileId);
        const bucket = (values) => {
            const map = new Map();
            for (const value of values) {
                if (!value)
                    continue;
                map.set(value, (map.get(value) ?? 0) + 1);
            }
            return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
        };
        return {
            byCity: bucket(events.map((event) => event.city)).map((row) => ({ city: row.key, count: row.count })),
            byCategory: bucket(events.map((event) => event.category)).map((row) => ({ category: row.key, count: row.count })),
            bySource: bucket(events.map((event) => event.source)).map((row) => ({ source: row.key, count: row.count }))
        };
    }
    getCreatorDiscoverabilityEligibility(creatorProfileId, input) {
        const state = this.getCreatorPremiumState(creatorProfileId);
        const reasons = [];
        if (!input.moderationHealthy)
            return { eligible: false, score: 0, reasons: ["moderation_blocked"], candidatePools: [] };
        if (input.trustScore < 0.5)
            return { eligible: false, score: 0, reasons: ["trust_below_threshold"], candidatePools: [] };
        let score = input.relevanceScore * 0.5 + input.trustScore * 0.3 + input.profileCompleteness * 0.2;
        if (state.entitlements[CREATOR_ENTITLEMENTS.DISCOVERY_BOOST_ELIGIBLE]) {
            score += 0.08;
            reasons.push("premium_candidate_pool_enabled");
        }
        if (state.tier === "elite") {
            score += 0.05;
            reasons.push("elite_priority_consideration");
        }
        const eligible = score >= 0.6;
        const candidatePools = eligible
            ? ["creator_quality_pool", ...(state.tier !== "standard" ? ["premium_creator_shelf"] : []), ...(state.tier === "elite" ? ["featured_creator_spotlight"] : [])]
            : [];
        return { eligible, score: Number(score.toFixed(3)), reasons, candidatePools };
    }
    updateCreatorBranding(actorUserId, creatorProfileId, patch) {
        const creator = this.deps.getCreatorProfile(creatorProfileId);
        if (!creator)
            throw new Error("CREATOR_NOT_FOUND");
        if (creator.userId !== actorUserId)
            throw new Error("FORBIDDEN");
        if (!this.hasCreatorEntitlement(creatorProfileId, CREATOR_ENTITLEMENTS.PROFILE_BRANDING))
            throw new Error("CREATOR_ENTITLEMENT_REQUIRED");
        if (patch.accentColor && !/^#[0-9a-fA-F]{6}$/.test(patch.accentColor))
            throw new ValidationError(["accentColor must be a hex color like #AABBCC"]);
        if (patch.links && patch.links.length > 8)
            throw new ValidationError(["maximum 8 links"]);
        const now = new Date().toISOString();
        const next = {
            creatorProfileId,
            featuredContentIds: [],
            specialties: [],
            links: [],
            ...(this.store.getBranding(creatorProfileId) ?? {}),
            ...patch,
            updatedAt: now
        };
        this.store.saveBranding(next);
        return next;
    }
    updateCreatorMonetizationSettings(actorUserId, creatorProfileId, patch) {
        const creator = this.deps.getCreatorProfile(creatorProfileId);
        if (!creator)
            throw new Error("CREATOR_NOT_FOUND");
        if (creator.userId !== actorUserId)
            throw new Error("FORBIDDEN");
        if (!this.hasCreatorEntitlement(creatorProfileId, CREATOR_ENTITLEMENTS.MONETIZATION_ENABLED))
            throw new Error("CREATOR_ENTITLEMENT_REQUIRED");
        const now = new Date().toISOString();
        const next = {
            creatorProfileId,
            tipsEnabled: false,
            premiumContentGatingEnabled: false,
            monetizedVideoEnabled: false,
            monetizedGuidesEnabled: false,
            collaborationInquiriesOpen: false,
            sponsoredContentLabelRequired: true,
            payoutReadinessStatus: "not_started",
            ...(this.store.getMonetizationControls(creatorProfileId) ?? {}),
            ...patch,
            updatedAt: now
        };
        this.store.saveMonetizationControls(next);
        return next;
    }
    getCreatorUpgradeContext(creatorProfileId) {
        const state = this.getCreatorPremiumState(creatorProfileId);
        if (state.tier === "standard") {
            return {
                creatorProfileId,
                currentTier: state.tier,
                missingEntitlements: Object.values(CREATOR_ENTITLEMENTS).filter((entitlement) => !state.entitlements[entitlement]),
                nextRecommendedTier: "pro",
                copy: "Upgrade to Creator Pro to unlock advanced analytics, branding, monetization controls, and discovery opportunities."
            };
        }
        return {
            creatorProfileId,
            currentTier: state.tier,
            missingEntitlements: Object.values(CREATOR_ENTITLEMENTS).filter((entitlement) => !state.entitlements[entitlement]),
            nextRecommendedTier: "elite",
            copy: "Upgrade to Creator Elite for full audience insights, expanded media limits, and priority creator programs."
        };
    }
}
