import type { IncomingMessage, ServerResponse } from "node:http";
import type { BusinessAnalyticsService } from "./service.js";
export declare function createBusinessAnalyticsHttpHandlers(service: BusinessAnalyticsService): {
    trackEvent(req: IncomingMessage, res: ServerResponse): Promise<void>;
    dashboard(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void>;
};
