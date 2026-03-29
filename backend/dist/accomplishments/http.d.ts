import type { IncomingMessage, ServerResponse } from "node:http";
import type { AccomplishmentsService } from "./service.js";
export declare function createAccomplishmentsHttpHandlers(service: AccomplishmentsService): {
    catalog: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    summary: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    recordEvent: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    updateFeatured: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
