import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocationClaimsService } from "./service.js";
export declare function createLocationClaimsHttpHandlers(service: LocationClaimsService): {
    nearby: (req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
    registerVisit: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    prepareClaim: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    completeAd: (_req: IncomingMessage, res: ServerResponse, adSessionId: string) => Promise<void>;
    finalizeClaim: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    history: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    pool: (_req: IncomingMessage, res: ServerResponse, url: URL) => Promise<void>;
};
