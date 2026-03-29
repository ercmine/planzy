import type { Logger } from "../../logging/loggerTypes.js";
import { type Plan } from "../plan.js";
export interface NormalizeOptions {
    provider: string;
    sourceId: string;
    now?: Date;
    logger?: Logger;
    requestId?: string;
}
export declare function normalizeBasePlan(fields: {
    title: unknown;
    description?: unknown;
    categoryInput?: {
        categories?: unknown;
        primary?: unknown;
    };
    location?: {
        lat?: unknown;
        lng?: unknown;
        address?: unknown;
    };
    rating?: unknown;
    reviewCount?: unknown;
    price?: unknown;
    photos?: unknown;
    hoursOpenNow?: unknown;
    hoursWeekdayText?: unknown;
    website?: unknown;
    phone?: unknown;
    booking?: unknown;
    ticket?: unknown;
    metadata?: unknown;
    distanceMeters?: unknown;
}, opts: NormalizeOptions): Plan;
