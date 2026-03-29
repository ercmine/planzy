import type { GeoAreaContext, GeoAreaContextRequest, GeoAutocompleteRequest, GeoHealthResponse, GeoGeocodeRequest, GeoPlaceLookupCandidate, GeoPlaceLookupRequest, GeoReverseGeocodeRequest, GeoReverseResult, GeoResult, GeoSuggestion } from "./contracts.js";
import type { GeoClientConfig } from "./config.js";
export declare class GeoServiceClient {
    private readonly config;
    constructor(config: GeoClientConfig);
    geocode(input: GeoGeocodeRequest): Promise<GeoResult[]>;
    reverseGeocode(input: GeoReverseGeocodeRequest): Promise<GeoReverseResult>;
    autocomplete(input: GeoAutocompleteRequest): Promise<GeoSuggestion[]>;
    placeLookup(input: GeoPlaceLookupRequest): Promise<GeoPlaceLookupCandidate[]>;
    areaContext(input: GeoAreaContextRequest): Promise<GeoAreaContext>;
    health(): Promise<GeoHealthResponse>;
    private request;
}
