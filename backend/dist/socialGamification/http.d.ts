import type { IncomingMessage, ServerResponse } from "node:http";
import type { SocialGamificationService } from "./service.js";
export declare function createSocialGamificationHttpHandlers(service: SocialGamificationService): {
    feed: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    privacy: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    updatePrivacy: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    recordAction: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    upsertGoal: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
