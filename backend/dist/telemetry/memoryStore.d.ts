import { type TelemetryStore } from "./store.js";
import type { TelemetryEventName, TelemetryRecord } from "./types.js";
export declare class MemoryTelemetryStore implements TelemetryStore {
    private readonly recordsBySession;
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
