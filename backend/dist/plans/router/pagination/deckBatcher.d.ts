import type { Plan } from "../../plan.js";
import { MemoryDeckSnapshotStore } from "./deckSnapshotStore.js";
export interface DeckBatchOptions {
    defaultBatchSize?: number;
    maxBatchSize?: number;
    cursorMaxAgeMs?: number;
    snapshotTtlMs?: number;
    snapshotEnabled?: boolean;
    maxOffset?: number;
}
export interface BatchResult {
    items: Plan[];
    nextCursor?: string | null;
    deckKey?: string;
}
export declare class DeckBatcher {
    private readonly opts;
    private readonly snapshotEnabledOverride?;
    private readonly store;
    private readonly now;
    constructor(opts?: DeckBatchOptions, deps?: {
        store?: MemoryDeckSnapshotStore;
        now?: () => number;
    });
    batch(plans: Plan[], params: {
        cursor?: string | null;
        requestedBatchSize?: number;
        sessionId?: string;
    }): BatchResult;
    private resolveBatchSize;
    private reorderWithSnapshot;
}
