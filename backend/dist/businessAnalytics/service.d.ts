import type { FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { VenueClaimStore } from "../venues/claims/store.js";
import type { BusinessAnalyticsStore } from "./store.js";
import type { BusinessPremiumService } from "../businessPremium/service.js";
import type { AnalyticsQuery, BusinessAnalyticsDashboard, BusinessAnalyticsEvent } from "./types.js";
export declare class BusinessAnalyticsService {
    private readonly store;
    private readonly claimsStore;
    private readonly accessEngine;
    private readonly businessPremium?;
    private readonly now;
    constructor(store: BusinessAnalyticsStore, claimsStore: VenueClaimStore, accessEngine: FeatureQuotaEngine, businessPremium?: BusinessPremiumService | undefined, now?: () => Date);
    recordEvent(input: Omit<BusinessAnalyticsEvent, "id">): Promise<BusinessAnalyticsEvent>;
    getDashboard(userId: string, query: AnalyticsQuery, isAdmin?: boolean): Promise<BusinessAnalyticsDashboard>;
    private boundHistory;
    private resolveEntitlements;
    private resolveAuthorizedPlaces;
    private computeKpis;
    private computeComparison;
    private buildTimeSeries;
    private buildPlaceBreakdown;
    private buildCreatorImpact;
    private buildRatingDistribution;
    private buildUpsell;
}
