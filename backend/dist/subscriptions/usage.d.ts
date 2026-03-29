import type { UsageCounter, UsageMetric, UsageWindow } from "./types.js";
export interface UsageStore {
    get(accountId: string, metric: UsageMetric, window: UsageWindow, periodKey?: string): Promise<number>;
    increment(accountId: string, metric: UsageMetric, window: UsageWindow, amount?: number, periodKey?: string): Promise<void>;
    listByAccount(accountId: string): Promise<UsageCounter[]>;
}
export declare class MemoryUsageStore implements UsageStore {
    private readonly store;
    get(accountId: string, metric: UsageMetric, window: UsageWindow, periodKey?: string): Promise<number>;
    increment(accountId: string, metric: UsageMetric, window: UsageWindow, amount?: number, periodKey?: string): Promise<void>;
    listByAccount(accountId: string): Promise<UsageCounter[]>;
}
export declare function currentPeriodKey(date?: Date): string;
