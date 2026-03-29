import type { ClickStore } from "./store.js";
import type { ClickAggregate, ListClicksResult, OutboundClickRecord } from "./types.js";
export declare class ClickTracker {
    private readonly store;
    private readonly now;
    constructor(store: ClickStore, deps?: {
        now?: () => Date;
    });
    track(input: unknown, ctx?: {
        userId?: string;
    }): Promise<OutboundClickRecord>;
    list(sessionId: string, opts?: unknown): Promise<ListClicksResult>;
    aggregate(sessionId: string): Promise<ClickAggregate>;
}
