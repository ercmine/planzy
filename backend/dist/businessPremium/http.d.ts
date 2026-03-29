import type { IncomingMessage, ServerResponse } from "node:http";
import type { BusinessPremiumService } from "./service.js";
export declare function createBusinessPremiumHttpHandlers(service: BusinessPremiumService): {
    getPremiumState(_req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
    setTier(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
    updateFeaturedPlacementSettings(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
    updateEnhancedProfile(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
    createCampaign(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
};
