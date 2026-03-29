import type { AnalyticsService } from "./service.js";
import type { AnalyticsEventName, AnalyticsEventCategory } from "./events.js";
export interface AnalyticsSummary {
    totalEvents: number;
    uniqueActors: number;
    byEventName: Partial<Record<AnalyticsEventName, number>>;
    byCategory: Partial<Record<AnalyticsEventCategory, number>>;
    conversionRate?: number;
}
export declare class AnalyticsQueryService {
    private readonly analytics;
    constructor(analytics: AnalyticsService);
    adminOverview(from: Date, to: Date): Promise<AnalyticsSummary>;
    creatorOverview(creatorId: string, from: Date, to: Date): Promise<AnalyticsSummary>;
    businessOverview(businessId: string, from: Date, to: Date): Promise<AnalyticsSummary>;
    private summarize;
}
