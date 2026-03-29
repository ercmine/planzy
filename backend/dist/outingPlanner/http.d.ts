import type { IncomingMessage, ServerResponse } from "node:http";
import type { RolloutService } from "../rollouts/service.js";
import type { OutingPlannerService } from "./service.js";
export declare function createOutingPlannerHandlers(service: OutingPlannerService, rolloutService?: RolloutService): {
    createPlan: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    savePlan: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    listSaved: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    getSaved: (req: IncomingMessage, res: ServerResponse, itineraryId: string) => Promise<void>;
    patchSaved: (req: IncomingMessage, res: ServerResponse, itineraryId: string) => Promise<void>;
    regenerate: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    deleteSaved: (req: IncomingMessage, res: ServerResponse, itineraryId: string) => Promise<void>;
    usage: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
