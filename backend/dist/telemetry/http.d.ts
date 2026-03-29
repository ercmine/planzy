import type { IncomingMessage, ServerResponse } from "node:http";
import type { TelemetryService } from "./telemetryService.js";
export declare function createTelemetryHttpHandlers(service: TelemetryService): {
    ingest: (req: IncomingMessage, res: ServerResponse, sessionId: string) => Promise<void>;
    list: (req: IncomingMessage, res: ServerResponse, sessionId: string) => Promise<void>;
    aggregate: (req: IncomingMessage, res: ServerResponse, sessionId: string) => Promise<void>;
};
