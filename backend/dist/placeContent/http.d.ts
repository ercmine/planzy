import type { IncomingMessage, ServerResponse } from "node:http";
import type { PlaceContentService } from "./service.js";
export interface PlaceContentHttpHandlers {
    createReview(req: IncomingMessage, res: ServerResponse): Promise<void>;
    createVideo(req: IncomingMessage, res: ServerResponse): Promise<void>;
    savePlace(req: IncomingMessage, res: ServerResponse): Promise<void>;
    removeSave(req: IncomingMessage, res: ServerResponse, canonicalPlaceId: string): Promise<void>;
    createGuide(req: IncomingMessage, res: ServerResponse): Promise<void>;
    addGuidePlace(req: IncomingMessage, res: ServerResponse, guideId: string): Promise<void>;
    placeContent(req: IncomingMessage, res: ServerResponse, canonicalPlaceId: string): Promise<void>;
    creatorContent(req: IncomingMessage, res: ServerResponse, userId: string): Promise<void>;
}
export declare function createPlaceContentHttpHandlers(service: PlaceContentService): PlaceContentHttpHandlers;
