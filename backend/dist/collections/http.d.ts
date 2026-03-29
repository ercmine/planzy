import type { IncomingMessage, ServerResponse } from "node:http";
import type { CollectionsService } from "./service.js";
export declare function createCollectionsHttpHandlers(service: CollectionsService): {
    list: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    detail: (req: IncomingMessage, res: ServerResponse, collectionId: string) => Promise<void>;
    upsert: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    recordEvent: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
