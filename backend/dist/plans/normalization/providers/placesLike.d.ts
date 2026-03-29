import type { Plan } from "../../plan.js";
export interface PlacesLikeRaw {
    id: string;
    name: string;
    types?: string[];
    category_tags?: string[];
    formatted_address?: string;
    geometry?: {
        location?: {
            lat?: number;
            lng?: number;
        };
    };
    rating?: number;
    user_ratings_total?: number;
    price_level?: unknown;
    photos?: Array<string | {
        url?: string;
        width?: number;
        height?: number;
    }>;
    opening_hours?: {
        open_now?: boolean;
        weekday_text?: string[];
    };
    website?: string;
    international_phone_number?: string;
    metadata?: Record<string, unknown>;
}
export declare function normalizePlacesLike(raw: PlacesLikeRaw, provider: string): Plan;
