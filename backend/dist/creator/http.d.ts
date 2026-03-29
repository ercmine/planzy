import type { IncomingMessage, ServerResponse } from "node:http";
import type { CreatorService } from "./service.js";
export declare function createCreatorHttpHandlers(service: CreatorService): {
    upsertProfile(req: IncomingMessage, res: ServerResponse): Promise<void>;
    updateProfile(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    getPublicProfile(req: IncomingMessage, res: ServerResponse, slug: string): Promise<void>;
    checkHandleAvailability(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listFollows(req: IncomingMessage, res: ServerResponse): Promise<void>;
    followingFeed(req: IncomingMessage, res: ServerResponse): Promise<void>;
    placeCreatorContent(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
    follow(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    unfollow(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    createGuide(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
    updateGuide(req: IncomingMessage, res: ServerResponse, guideId: string): Promise<void>;
    getGuide(req: IncomingMessage, res: ServerResponse, slug: string, guideSlug: string): Promise<void>;
    searchGuides(req: IncomingMessage, res: ServerResponse): Promise<void>;
    analytics(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void>;
};
