import type { AnalyticsEventContext, AnalyticsEventInput, AnalyticsEventRecord, AnalyticsIngestResult, AnalyticsStore } from "./types.js";
export declare class AnalyticsService {
    private readonly store;
    constructor(store: AnalyticsStore);
    ingestBatch(context: AnalyticsEventContext, events: unknown[]): Promise<AnalyticsIngestResult>;
    track(event: AnalyticsEventInput, context: AnalyticsEventContext): Promise<void>;
    listAll(): Promise<AnalyticsEventRecord[]>;
    private defaultDedupeKey;
}
