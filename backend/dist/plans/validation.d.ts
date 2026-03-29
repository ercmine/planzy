import type { Category, PriceLevel, SearchPlansInput, TimeWindow } from "./types.js";
export interface SearchPlansInputNormalized {
    location: {
        lat: number;
        lng: number;
    };
    radiusMeters: number;
    timeWindow?: TimeWindow;
    categories?: Category[];
    priceLevelMax?: PriceLevel;
    openNow?: boolean;
    limit: number;
    cursor: string | null;
    locale?: string;
}
export declare function validateSearchPlansInput(input: SearchPlansInput): SearchPlansInputNormalized;
