import type { ProviderAdapter } from "./types.js";
export declare const googlePlacesAdapter: ProviderAdapter;
export declare const foursquareAdapter: ProviderAdapter;
export declare const genericAdapter: ProviderAdapter;
export declare function getProviderAdapter(provider: string): ProviderAdapter;
