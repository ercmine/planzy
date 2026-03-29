import type { GeocodeRequest, ReverseGeocodeRequest } from "./types.js";
import type { NominatimReverseItem, NominatimSearchItem } from "./normalization.js";
export interface NominatimClientOptions {
    baseUrl: string;
    timeoutMs: number;
    userAgent: string;
}
export declare class NominatimClient {
    private readonly options;
    constructor(options: NominatimClientOptions);
    search(input: GeocodeRequest): Promise<NominatimSearchItem[]>;
    reverse(input: ReverseGeocodeRequest): Promise<NominatimReverseItem>;
    health(): Promise<void>;
    private fetchJson;
    private fetchText;
}
