import type { IncomingMessage, ServerResponse } from "node:http";
import type { CanonicalPlace } from "../places/types.js";
import type { GeoGateway } from "./gateway.js";
export interface GeoRuntimeStatus {
    mode: "custom" | "nominatim" | "disabled";
    routesMounted: boolean;
    upstreamBaseUrl?: string;
    envValidationErrors: string[];
    envValidationWarnings: string[];
}
interface NearbyDiscoveryConfig {
    targetCandidates: number;
    maxQueryFanout: number;
    cellSubdivisions: number;
    perQueryLimit: number;
    queryTimeoutMs: number;
    queryConcurrency: number;
    cacheTtlMs: number;
    cacheStaleMs: number;
}
export declare function createGeoHttpHandlers(gateway: GeoGateway | null, options?: {
    authSecret?: string;
    rateLimitPerMinute?: number;
    listCanonicalPlaces?: () => CanonicalPlace[];
    getStatus?: () => GeoRuntimeStatus;
    nearbyConfig?: Partial<NearbyDiscoveryConfig>;
}): {
    geocode(req: IncomingMessage, res: ServerResponse): Promise<void>;
    reverseGeocode(req: IncomingMessage, res: ServerResponse): Promise<void>;
    apiSearch(req: IncomingMessage, res: ServerResponse): Promise<void>;
    apiReverse(req: IncomingMessage, res: ServerResponse): Promise<void>;
    apiAutocomplete(req: IncomingMessage, res: ServerResponse): Promise<void>;
    apiNearby(req: IncomingMessage, res: ServerResponse): Promise<void>;
    autocomplete(req: IncomingMessage, res: ServerResponse): Promise<void>;
    placeLookup(req: IncomingMessage, res: ServerResponse): Promise<void>;
    areaContext(req: IncomingMessage, res: ServerResponse): Promise<void>;
    health(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    debugStatus(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    ready(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    version(_req: IncomingMessage, res: ServerResponse): Promise<void>;
    metrics(_req: IncomingMessage, res: ServerResponse): Promise<void>;
};
export {};
