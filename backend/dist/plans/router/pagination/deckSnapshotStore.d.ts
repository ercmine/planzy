import type { RetentionPolicy } from "../../../retention/policy.js";
export interface DeckSnapshot {
    deckKey: string;
    planIds: string[];
    storedAtMs: number;
    ttlMs: number;
}
export declare class MemoryDeckSnapshotStore {
    private readonly snapshots;
    private readonly retentionPolicy;
    constructor(retentionPolicy?: RetentionPolicy);
    get(deckKey: string, nowMs: number): DeckSnapshot | null;
    set(deckKey: string, planIds: string[], nowMs: number, ttlMs: number): void;
    createKey(sessionId?: string): string;
    private evictExpired;
}
