import type { ClickTracker } from "../analytics/clicks/clickTracker.js";
import type { TelemetryStore } from "./store.js";
import type { IngestResult, TelemetryRecord } from "./types.js";
export declare class TelemetryService {
    private readonly store;
    private readonly now;
    private readonly clickTracker?;
    constructor(store: TelemetryStore, deps?: {
        now?: () => Date;
        clickTracker?: ClickTracker;
    });
    ingestBatch(sessionId: string, body: unknown, ctx?: {
        userId?: string;
        requestId?: string;
    }): Promise<IngestResult>;
    list(sessionId: string, opts?: {
        limit?: number;
        cursor?: string | null;
    }): Promise<{
        items: TelemetryRecord[];
        nextCursor?: string | null;
    }>;
    aggregate(sessionId: string): Promise<{
        countsByEvent: Record<import("./types.js").TelemetryEventName, number>;
        swipes: {
            yes: number;
            no: number;
            maybe: number;
        };
        outboundByLinkType: Record<string, number>;
    }>;
}
