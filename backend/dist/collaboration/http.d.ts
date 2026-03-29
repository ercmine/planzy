import type { IncomingMessage, ServerResponse } from "node:http";
import type { AccountsService } from "../accounts/service.js";
import type { CollaborationService } from "./service.js";
export declare function createCollaborationHttpHandlers(service: CollaborationService, accounts: AccountsService): {
    createInvite(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listBusinessInvites(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void>;
    listCreatorInvites(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    respondToInvite(req: IncomingMessage, res: ServerResponse, inviteId: string): Promise<void>;
    transitionCampaign(req: IncomingMessage, res: ServerResponse, campaignId: string): Promise<void>;
    linkCampaignContent(req: IncomingMessage, res: ServerResponse): Promise<void>;
    addFeaturedPlacement(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listFeaturedForPlace(_: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
};
