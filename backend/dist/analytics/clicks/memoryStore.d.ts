import { RetentionPolicy } from "../../retention/policy.js";
import type { ClickStore } from "./store.js";
import type { ClickAggregate, ListClicksOptions, ListClicksResult, OutboundClickRecord } from "./types.js";
export declare class MemoryClickStore implements ClickStore {
    private readonly clicksBySession;
    private readonly retentionPolicy;
    constructor(retentionPolicy?: RetentionPolicy);
    record(click: OutboundClickRecord): Promise<void>;
    listBySession(sessionId: string, opts?: ListClicksOptions): Promise<ListClicksResult>;
    aggregateBySession(sessionId: string): Promise<ClickAggregate>;
    prune(maxAgeMs?: number, now?: Date): number;
}
