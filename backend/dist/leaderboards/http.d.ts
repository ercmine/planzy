import type { IncomingMessage, ServerResponse } from "node:http";
import type { LeaderboardsService } from "./service.js";
export declare function createLeaderboardHttpHandlers(service: LeaderboardsService): {
    families: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    list: (_req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    me: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    record: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    inspect: (_req: IncomingMessage, res: ServerResponse, type: string, entityId: string, url: URL) => Promise<void>;
    tune: (req: IncomingMessage, res: ServerResponse, type: string) => Promise<void>;
    formulas: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
