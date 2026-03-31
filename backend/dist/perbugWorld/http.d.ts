import type { IncomingMessage, ServerResponse } from "node:http";
import { PerbugWorldService } from "./service.js";
export declare function createPerbugWorldHttpHandlers(service: PerbugWorldService): {
    bootstrap(req: IncomingMessage, res: ServerResponse): Promise<void>;
    move(req: IncomingMessage, res: ServerResponse): Promise<void>;
    previewEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
    launchEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
    submitEncounterAction(req: IncomingMessage, res: ServerResponse): Promise<void>;
    finalizeEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
    abandonEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
    retryEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
    resolveEncounter(req: IncomingMessage, res: ServerResponse): Promise<void>;
};
