import type { IncomingMessage, ServerResponse } from "node:http";
import type { OnboardingService } from "./service.js";
export interface OnboardingHttpHandlers {
    getPreferences(req: IncomingMessage, res: ServerResponse): Promise<void>;
    upsertPreferences(req: IncomingMessage, res: ServerResponse): Promise<void>;
    bootstrapFeed(req: IncomingMessage, res: ServerResponse): Promise<void>;
}
export declare function createOnboardingHttpHandlers(service: OnboardingService): OnboardingHttpHandlers;
