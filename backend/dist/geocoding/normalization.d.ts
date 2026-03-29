import type { GeocodeResult, ReverseGeocodeResult } from "./types.js";
export interface NominatimSearchItem {
    display_name?: string;
    osm_id?: number;
    osm_type?: string;
    lat?: string;
    lon?: string;
    class?: string;
    type?: string;
    importance?: number;
    boundingbox?: string[];
    address?: Record<string, string>;
}
export interface NominatimReverseItem {
    display_name?: string;
    osm_id?: number;
    osm_type?: string;
    lat?: string;
    lon?: string;
    address?: Record<string, string>;
}
export declare function normalizeSearchItem(item: NominatimSearchItem): GeocodeResult | null;
export declare function normalizeReverseItem(item: NominatimReverseItem): ReverseGeocodeResult | null;
