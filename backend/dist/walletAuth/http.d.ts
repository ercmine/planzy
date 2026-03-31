import type { IncomingMessage, ServerResponse } from "node:http";
import type { WalletAuthService } from "./service.js";
export declare function createWalletAuthHttpHandlers(service: WalletAuthService): {
    createChallenge: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    verifyChallenge: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    restoreSession: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    logout: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    listWallets: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    verificationEvents: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
