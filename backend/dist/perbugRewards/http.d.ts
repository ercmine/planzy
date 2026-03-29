import type { IncomingMessage, ServerResponse } from "node:http";
import type { DryadRewardsService } from "./service.js";
export declare function createDryadRewardsHttpHandlers(service: DryadRewardsService): {
    preview: (_req: IncomingMessage, res: ServerResponse, placeId: string) => Promise<void>;
    createWalletNonce: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    verifyWalletLogin: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    listWallets: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    setPrimaryWallet: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    dashboard: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    submitReview: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    approveReview: (req: IncomingMessage, res: ServerResponse, reviewId: string) => Promise<void>;
    rejectReview: (req: IncomingMessage, res: ServerResponse, reviewId: string) => Promise<void>;
    claim: (req: IncomingMessage, res: ServerResponse, rewardId: string) => Promise<void>;
    auditLogs: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    rewardTiers: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
