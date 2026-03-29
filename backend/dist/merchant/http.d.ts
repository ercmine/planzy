import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "../logging/loggerTypes.js";
import { MerchantService } from "./service.js";
export declare function createMerchantHttpHandlers(service: MerchantService, deps?: {
    logger?: Logger;
}): {
    createPromoted(req: IncomingMessage, res: ServerResponse): Promise<void>;
    patchPromoted(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listPromoted(req: IncomingMessage, res: ServerResponse): Promise<void>;
    deletePromoted(req: IncomingMessage, res: ServerResponse): Promise<void>;
    createSpecial(req: IncomingMessage, res: ServerResponse): Promise<void>;
    patchSpecial(req: IncomingMessage, res: ServerResponse): Promise<void>;
    listSpecials(req: IncomingMessage, res: ServerResponse): Promise<void>;
    deleteSpecial(req: IncomingMessage, res: ServerResponse): Promise<void>;
};
export declare function handleMerchantHttpError(res: ServerResponse, error: unknown): void;
