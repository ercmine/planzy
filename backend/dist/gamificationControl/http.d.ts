import type { IncomingMessage, ServerResponse } from "node:http";
import type { GamificationControlService } from "./service.js";
export declare function createGamificationControlHttpHandlers(service: GamificationControlService): {
    summary: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    processEvent: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    createDraft: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    publish: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    recompute: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminSnapshot: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    explainDecision: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
