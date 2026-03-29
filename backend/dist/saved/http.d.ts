import type { IncomingMessage, ServerResponse } from "node:http";
import type { SavedService } from "./service.js";
export interface SavedHttpHandlers {
    savePlace(req: IncomingMessage, res: ServerResponse): Promise<void>;
    unsavePlace(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
    listSaved(req: IncomingMessage, res: ServerResponse): Promise<void>;
    createList(req: IncomingMessage, res: ServerResponse): Promise<void>;
    updateList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
    getList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
    addPlaceToList(req: IncomingMessage, res: ServerResponse, listId: string): Promise<void>;
    removePlaceFromList(req: IncomingMessage, res: ServerResponse, listId: string, placeId: string): Promise<void>;
    listPublicByUser(req: IncomingMessage, res: ServerResponse, userId: string): Promise<void>;
}
export declare function createSavedHttpHandlers(service: SavedService): SavedHttpHandlers;
