import type { BusinessAnalyticsEvent, BusinessDailyMetric } from "./types.js";
export interface BusinessAnalyticsStore {
    recordEvent(event: BusinessAnalyticsEvent): Promise<void>;
    listEventsByBusiness(input: {
        businessProfileId: string;
        placeIds: string[];
        from: string;
        to: string;
    }): Promise<BusinessAnalyticsEvent[]>;
    listDailyMetrics(input: {
        businessProfileId: string;
        placeIds: string[];
        from: string;
        to: string;
    }): Promise<BusinessDailyMetric[]>;
}
export declare class MemoryBusinessAnalyticsStore implements BusinessAnalyticsStore {
    private readonly events;
    private readonly daily;
    recordEvent(event: BusinessAnalyticsEvent): Promise<void>;
    listEventsByBusiness(input: {
        businessProfileId: string;
        placeIds: string[];
        from: string;
        to: string;
    }): Promise<BusinessAnalyticsEvent[]>;
    listDailyMetrics(input: {
        businessProfileId: string;
        placeIds: string[];
        from: string;
        to: string;
    }): Promise<BusinessDailyMetric[]>;
}
