import type { Plan } from "../../plan.js";
export interface EventsLikeRaw {
    id: string;
    title: string;
    description?: string;
    venue?: {
        name?: string;
        address?: string;
        lat?: number;
        lng?: number;
    };
    startTimeISO?: string;
    priceHint?: string;
    url?: string;
    ticketUrl?: string;
    imageUrls?: string[];
    metadata?: Record<string, unknown>;
}
export declare function normalizeEventsLike(raw: EventsLikeRaw, provider: string): Plan;
