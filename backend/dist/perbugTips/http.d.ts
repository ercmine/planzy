import type { IncomingMessage, ServerResponse } from "node:http";
import { PerbugTipsService } from "./service.js";
export declare function createPerbugTipsHttpHandlers(service: PerbugTipsService): {
    createIntent: (req: IncomingMessage, res: ServerResponse, videoId: string) => Promise<void>;
    submit: (req: IncomingMessage, res: ServerResponse, tipIntentId: string) => Promise<void>;
    listVideo: (_req: IncomingMessage, res: ServerResponse, videoId: string) => Promise<void>;
    creatorSummary: (_req: IncomingMessage, res: ServerResponse, creatorUserId: string) => Promise<void>;
    sent: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    received: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
