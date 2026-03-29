import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreatorMonetizationService } from "./service.js";
export declare function createCreatorMonetizationHttpHandlers(service: CreatorMonetizationService): {
    getProfile(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    updateSettings(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    createTipIntent(req: IncomingMessage, res: ServerResponse): Promise<void>;
    setGuidePremium(req: IncomingMessage, res: ServerResponse, creatorProfileId: string, guideId: string): Promise<void>;
    createMembershipPlan(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    adminStatus(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
};
