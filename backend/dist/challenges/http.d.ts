import type { IncomingMessage, ServerResponse } from "node:http";
import type { ChallengesService } from "./service.js";
export declare function createChallengesHttpHandlers(service: ChallengesService): {
    list: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    summary: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    questHub: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    detail: (req: IncomingMessage, res: ServerResponse, challengeId: string) => Promise<void>;
    upsert: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    recordEvent: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
