import type { IncomingMessage, ServerResponse } from "node:http";
import type { AnalyticsQueryService } from "./queryService.js";
import type { AnalyticsService } from "./service.js";
export declare function createAnalyticsHttpHandlers(service: AnalyticsService, query: AnalyticsQueryService): {
    ingest(req: IncomingMessage, res: ServerResponse): Promise<void>;
    adminOverview(req: IncomingMessage, res: ServerResponse): Promise<void>;
    creatorOverview(req: IncomingMessage, res: ServerResponse, creatorId: string): Promise<void>;
    businessOverview(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void>;
};
