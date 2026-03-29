import type { AnalyticsEventRecord, AnalyticsStore } from "./types.js";
export declare class MemoryAnalyticsStore implements AnalyticsStore {
    private readonly events;
    private readonly dedupe;
    insert(events: AnalyticsEventRecord[]): Promise<void>;
    list(): Promise<AnalyticsEventRecord[]>;
    hasDedupeKey(dedupeKey: string): Promise<boolean>;
}
