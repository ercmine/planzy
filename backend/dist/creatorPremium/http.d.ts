import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreatorPremiumService } from "./service.js";
export declare function createCreatorPremiumHttpHandlers(service: CreatorPremiumService): {
    premiumState(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    analyticsOverview(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    analyticsAudience(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    trackAnalytics(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    quotaState(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string, feature: string): Promise<void>;
    consumeQuota(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string, feature: string): Promise<void>;
    discoverability(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    updateBranding(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    updateMonetization(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    upgradeContext(_req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
};
