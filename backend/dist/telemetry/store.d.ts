import type { TelemetryEventName, TelemetryRecord } from "./types.js";
export interface TelemetryStore {
    record(rec: TelemetryRecord): Promise<void>;
    listBySession(sessionId: string, opts?: {
        limit?: number;
        cursor?: string | null;
    }): Promise<{
        items: TelemetryRecord[];
        nextCursor?: string | null;
    }>;
    aggregateBySession(sessionId: string): Promise<{
        countsByEvent: Record<TelemetryEventName, number>;
        swipes: {
            yes: number;
            no: number;
            maybe: number;
        };
        outboundByLinkType: Record<string, number>;
    }>;
}
export declare function encodeOffsetCursor(offset: number): string;
export declare function decodeOffsetCursor(cursor: string | null | undefined): number;
