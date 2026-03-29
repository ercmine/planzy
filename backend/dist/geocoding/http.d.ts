import type { IncomingMessage, ServerResponse } from "node:http";
import type { GeocodingService } from "./service.js";
export declare function createGeocodingHttpHandlers(service: GeocodingService): {
    geocode(req: IncomingMessage, res: ServerResponse): Promise<void>;
    reverseGeocode(req: IncomingMessage, res: ServerResponse): Promise<void>;
    health(_req: IncomingMessage, res: ServerResponse): Promise<void>;
};
