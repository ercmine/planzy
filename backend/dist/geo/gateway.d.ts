import type { GeoAreaContext, GeoAreaContextRequest, GeoAutocompleteRequest, GeoHealthResponse, GeoGeocodeRequest, GeoPlaceLookupCandidate, GeoPlaceLookupRequest, GeoReverseGeocodeRequest, GeoReverseResult, GeoResult, GeoSuggestion } from "./contracts.js";
export interface GeoGateway {
    geocode(input: GeoGeocodeRequest): Promise<GeoResult[]>;
    reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult>;
    autocomplete(input: GeoAutocompleteRequest): Promise<GeoSuggestion[]>;
    placeLookup(input: GeoPlaceLookupRequest): Promise<GeoPlaceLookupCandidate[]>;
    areaContext(input: GeoAreaContextRequest): Promise<GeoAreaContext>;
    health(): Promise<GeoHealthResponse>;
}
export interface BackendGeoRuntime {
    gateway: GeoGateway | null;
    mode: "custom" | "nominatim" | "disabled";
    routesMounted: boolean;
    upstreamBaseUrl?: string;
    validationErrors: string[];
    validationWarnings: string[];
}
export declare function initBackendGeoRuntime(env?: NodeJS.ProcessEnv): BackendGeoRuntime;
export declare function createBackendGeoGatewayFromEnv(env?: NodeJS.ProcessEnv): GeoGateway | null;
