import type { DataClass, RetentionConfig } from "./types.js";
export declare function coercePositiveMs(x: unknown, fallback: number): number;
export declare function defaultRetentionConfig(): RetentionConfig;
export declare class RetentionPolicy {
    readonly config: RetentionConfig;
    private readonly providerRuleByName;
    constructor(cfg?: Partial<RetentionConfig>);
    clampTtl(dataClass: DataClass, requestedTtlMs: number): number;
    clampProviderTtl(provider: string, requestedTtlMs: number): number;
    isLongTermStorageAllowed(provider: string): boolean;
}
