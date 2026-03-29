import type { ClickAggregate, ListClicksOptions, ListClicksResult, OutboundClickRecord } from "./types.js";
export interface ClickStore {
    record(click: OutboundClickRecord): Promise<void>;
    listBySession(sessionId: string, opts?: ListClicksOptions): Promise<ListClicksResult>;
    aggregateBySession(sessionId: string): Promise<ClickAggregate>;
}
export declare function encodeOffsetCursor(offset: number): string;
export declare function decodeOffsetCursor(cursor: string | null | undefined): number;
