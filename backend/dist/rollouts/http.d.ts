import type { IncomingMessage, ServerResponse } from "node:http";
import type { RolloutService } from "./service.js";
export declare function createRolloutHttpHandlers(rolloutService: RolloutService): {
    summary: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    evaluate: (req: IncomingMessage, res: ServerResponse, featureKey: string) => Promise<void>;
    adminList: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminUpsert: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminAudit: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
