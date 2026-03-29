import { randomUUID } from "node:crypto";
import { FEATURE_KEYS } from "../subscriptions/accessEngine.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
export class BusinessAnalyticsService {
    store;
    claimsStore;
    accessEngine;
    businessPremium;
    now;
    constructor(store, claimsStore, accessEngine, businessPremium, now = () => new Date()) {
        this.store = store;
        this.claimsStore = claimsStore;
        this.accessEngine = accessEngine;
        this.businessPremium = businessPremium;
        this.now = now;
    }
    async recordEvent(input) {
        const event = { ...input, id: randomUUID() };
        await this.store.recordEvent(event);
        return event;
    }
    async getDashboard(userId, query, isAdmin = false) {
        const allowedPlaceIds = await this.resolveAuthorizedPlaces({ userId, businessProfileId: query.businessProfileId, placeIds: query.placeIds, isAdmin });
        const entitlements = await this.resolveEntitlements(query.businessProfileId);
        const bounded = this.boundHistory(query, entitlements.extendedHistoryDays);
        const metrics = await this.store.listDailyMetrics({
            businessProfileId: query.businessProfileId,
            placeIds: allowedPlaceIds,
            from: bounded.from,
            to: bounded.to
        });
        const kpis = this.computeKpis(metrics);
        const comparison = bounded.compareFrom && bounded.compareTo
            ? this.computeComparison(kpis, this.computeKpis(await this.store.listDailyMetrics({
                businessProfileId: query.businessProfileId,
                placeIds: allowedPlaceIds,
                from: bounded.compareFrom,
                to: bounded.compareTo
            })))
            : undefined;
        const timeSeries = entitlements.advancedAnalytics ? this.buildTimeSeries(metrics, bounded.from, bounded.to) : [];
        const placeBreakdown = this.buildPlaceBreakdown(metrics);
        const ratingDistribution = this.buildRatingDistribution(metrics);
        const creatorImpact = entitlements.creatorImpactAnalytics
            ? await this.buildCreatorImpact(query.businessProfileId, allowedPlaceIds, bounded.from, bounded.to)
            : [];
        return {
            scope: { businessProfileId: query.businessProfileId, placeIds: allowedPlaceIds, from: bounded.from, to: bounded.to },
            kpis,
            comparison,
            timeSeries,
            placeBreakdown: entitlements.multiLocationAnalytics ? placeBreakdown : placeBreakdown.slice(0, 1),
            creatorImpact,
            ratingDistribution,
            entitlements,
            upsell: this.buildUpsell(kpis, entitlements, query.placeIds.length)
        };
    }
    boundHistory(query, historyDays) {
        const latest = this.now().toISOString().slice(0, 10);
        const min = new Date(this.now());
        min.setUTCDate(min.getUTCDate() - historyDays + 1);
        const minDate = min.toISOString().slice(0, 10);
        return {
            ...query,
            from: query.from < minDate ? minDate : query.from,
            to: query.to > latest ? latest : query.to,
            compareFrom: query.compareFrom,
            compareTo: query.compareTo
        };
    }
    async resolveEntitlements(businessProfileId) {
        const target = { targetType: SubscriptionTargetType.BUSINESS, targetId: businessProfileId };
        const features = this.accessEngine.resolveFeatureSet(target).features;
        const basic = Boolean(features[FEATURE_KEYS.BUSINESS_ANALYTICS_BASIC]);
        const advanced = Boolean(features[FEATURE_KEYS.BUSINESS_ANALYTICS_ADVANCED]);
        const premiumAdvanced = this.businessPremium ? await this.businessPremium.canAccessAdvancedBusinessAnalytics(businessProfileId) : advanced;
        const creatorImpact = this.businessPremium ? await this.businessPremium.hasBusinessEntitlement(businessProfileId, "business.insights.creatorImpact") : premiumAdvanced;
        const multiLocation = this.businessPremium ? await this.businessPremium.canManageMultipleLocations(businessProfileId) : premiumAdvanced;
        const exportAnalytics = this.businessPremium ? await this.businessPremium.hasBusinessEntitlement(businessProfileId, "business.reporting.export") : premiumAdvanced;
        return {
            basicAnalytics: basic,
            advancedAnalytics: premiumAdvanced,
            creatorImpactAnalytics: creatorImpact,
            multiLocationAnalytics: multiLocation,
            exportAnalytics,
            extendedHistoryDays: premiumAdvanced ? 365 : 30,
            lockedModules: premiumAdvanced
                ? []
                : ["timeseries", "creator_impact", "multi_location", "export", "advanced_breakdowns"]
        };
    }
    async resolveAuthorizedPlaces(input) {
        if (!input.placeIds.length)
            throw new Error("PLACE_SCOPE_REQUIRED");
        if (input.isAdmin)
            return input.placeIds;
        const authorized = [];
        for (const placeId of input.placeIds) {
            const ownership = (await this.claimsStore.listOwnershipByPlace(placeId)).find((entry) => (entry.isActive
                && entry.verificationStatus === "verified"
                && entry.businessProfileId === input.businessProfileId
                && entry.primaryUserId === input.userId));
            if (ownership)
                authorized.push(placeId);
        }
        if (!authorized.length)
            throw new Error("ANALYTICS_ACCESS_DENIED");
        return authorized;
    }
    computeKpis(metrics) {
        const totals = metrics.reduce((acc, row) => {
            acc.views += row.views;
            acc.uniqueViewersApprox += row.uniqueViewersApprox;
            acc.saves += row.saves;
            acc.listAdds += row.listAdds;
            acc.outboundClicks += row.outboundClicks;
            acc.newReviews += row.reviewCount;
            acc.ratingSum += row.ratingSum;
            acc.ratingCount += row.ratingCount;
            acc.reviewResponses += row.reviewResponses;
            acc.creatorDriven += row.creatorClickthrough;
            return acc;
        }, { views: 0, uniqueViewersApprox: 0, saves: 0, listAdds: 0, outboundClicks: 0, newReviews: 0, ratingSum: 0, ratingCount: 0, reviewResponses: 0, creatorDriven: 0 });
        const engagementScore = (totals.saves * 3) + (totals.outboundClicks * 4) + (totals.newReviews * 5) + (totals.creatorDriven * 2);
        return {
            views: totals.views,
            uniqueViewersApprox: totals.uniqueViewersApprox,
            saves: totals.saves,
            listAdds: totals.listAdds,
            outboundClicks: totals.outboundClicks,
            engagementScore,
            ctr: totals.views ? Number((totals.outboundClicks / totals.views).toFixed(4)) : 0,
            saveRate: totals.views ? Number((totals.saves / totals.views).toFixed(4)) : 0,
            newReviews: totals.newReviews,
            averageRating: totals.ratingCount ? Number((totals.ratingSum / totals.ratingCount).toFixed(2)) : null,
            reviewResponseRate: totals.newReviews ? Number((totals.reviewResponses / totals.newReviews).toFixed(4)) : null,
            creatorDrivenEngagement: totals.creatorDriven
        };
    }
    computeComparison(current, previous) {
        return Object.keys(current).map((metric) => {
            const key = metric;
            const c = current[key];
            const p = previous[key];
            const delta = typeof c === "number" && typeof p === "number" ? c - p : null;
            const pctDelta = typeof delta === "number" && typeof p === "number" && p !== 0 ? Number((delta / p).toFixed(4)) : null;
            return { metric: key, current: c, previous: p, delta, pctDelta };
        });
    }
    buildTimeSeries(metrics, from, to) {
        const byDate = new Map();
        for (const row of metrics) {
            const current = byDate.get(row.date) ?? { date: row.date, views: 0, saves: 0, outboundClicks: 0, reviews: 0, averageRating: null, creatorImpact: 0 };
            current.views += row.views;
            current.saves += row.saves;
            current.outboundClicks += row.outboundClicks;
            current.reviews += row.reviewCount;
            current.creatorImpact += row.creatorClickthrough;
            if (row.ratingCount) {
                const priorCount = current.averageRating === null ? 0 : 1;
                current.averageRating = Number((((current.averageRating ?? 0) * priorCount + (row.ratingSum / row.ratingCount)) / (priorCount + 1)).toFixed(2));
            }
            byDate.set(row.date, current);
        }
        const points = [];
        for (let date = new Date(`${from}T00:00:00.000Z`); date <= new Date(`${to}T00:00:00.000Z`); date.setUTCDate(date.getUTCDate() + 1)) {
            const key = date.toISOString().slice(0, 10);
            points.push(byDate.get(key) ?? { date: key, views: 0, saves: 0, outboundClicks: 0, reviews: 0, averageRating: null, creatorImpact: 0 });
        }
        return points;
    }
    buildPlaceBreakdown(metrics) {
        const byPlace = new Map();
        for (const row of metrics) {
            const current = byPlace.get(row.placeId) ?? { placeId: row.placeId, views: 0, saves: 0, outboundClicks: 0, engagementScore: 0, newReviews: 0, averageRating: null, creatorImpact: 0 };
            current.views += row.views;
            current.saves += row.saves;
            current.outboundClicks += row.outboundClicks;
            current.newReviews += row.reviewCount;
            current.creatorImpact += row.creatorClickthrough;
            current.engagementScore = (current.saves * 3) + (current.outboundClicks * 4) + (current.newReviews * 5) + (current.creatorImpact * 2);
            if (row.ratingCount) {
                current.averageRating = Number(((((current.averageRating ?? 0) + (row.ratingSum / row.ratingCount)) / 2)).toFixed(2));
            }
            byPlace.set(row.placeId, current);
        }
        return [...byPlace.values()].sort((a, b) => b.engagementScore - a.engagementScore);
    }
    async buildCreatorImpact(businessProfileId, placeIds, from, to) {
        const events = await this.store.listEventsByBusiness({ businessProfileId, placeIds, from, to });
        const map = new Map();
        for (const event of events) {
            if (!event.creatorProfileId)
                continue;
            const row = map.get(event.creatorProfileId) ?? { creatorProfileId: event.creatorProfileId, exposure: 0, clickthrough: 0, savesAfterExposure: 0, attribution: "inferred" };
            if (event.eventType === "creator_content_exposure")
                row.exposure += 1;
            if (event.eventType === "creator_content_clickthrough") {
                row.clickthrough += 1;
                row.attribution = "direct";
            }
            if (event.eventType === "place_save" && event.sourceSurface?.startsWith("creator:"))
                row.savesAfterExposure += 1;
            map.set(event.creatorProfileId, row);
        }
        return [...map.values()].sort((a, b) => b.clickthrough - a.clickthrough).slice(0, 10);
    }
    buildRatingDistribution(metrics) {
        const totalCount = metrics.reduce((sum, row) => sum + row.ratingCount, 0);
        const avg = totalCount ? metrics.reduce((sum, row) => sum + row.ratingSum, 0) / totalCount : 0;
        return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: stars === Math.round(avg) ? totalCount : 0 }));
    }
    buildUpsell(kpis, entitlements, placeCount) {
        const upsell = [];
        if (!entitlements.advancedAnalytics && kpis.views > 100) {
            upsell.push({ code: "HIGH_TRAFFIC_HISTORY_LOCKED", message: "Traffic is growing. Upgrade to unlock trend depth and period comparisons.", recommendedPlan: "business-plus" });
        }
        if (!entitlements.creatorImpactAnalytics && kpis.creatorDrivenEngagement > 0) {
            upsell.push({ code: "CREATOR_IMPACT_LOCKED", message: "Creator activity detected. Upgrade to view creator-level impact attribution.", recommendedPlan: "business-plus" });
        }
        if (!entitlements.multiLocationAnalytics && placeCount > 1) {
            upsell.push({ code: "MULTI_LOCATION_LOCKED", message: "Manage all locations in one rollup with Business Elite analytics.", recommendedPlan: "business-elite" });
        }
        return upsell;
    }
}
