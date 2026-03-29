import type { ProviderCallOutcome, ProviderHealthConfig, ProviderHealthSnapshot } from "./healthTypes.js";
export declare class ProviderHealthMonitor {
    private readonly cfg;
    private readonly now;
    private readonly stateByProvider;
    constructor(cfg?: Partial<ProviderHealthConfig>, deps?: {
        now?: () => number;
    });
    record(outcome: Omit<ProviderCallOutcome, "atMs"> & {
        atMs?: number;
    }): void;
    shouldSkip(provider: string): {
        skip: boolean;
        reason?: string;
        retryAfterMs?: number;
    };
    noteAttempt(provider: string): void;
    snapshot(provider: string): ProviderHealthSnapshot | null;
    snapshots(): ProviderHealthSnapshot[];
    reset(provider: string): void;
    private getState;
    private evaluateForDisable;
    private disable;
    private computeSnapshot;
}
