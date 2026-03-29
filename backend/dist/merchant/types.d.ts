import type { Category, Plan } from "../plans/plan.js";
export type PromoStatus = "active" | "paused" | "ended";
export interface PromotedPlanInput {
    venueId: string;
    provider?: string;
    title: string;
    description?: string;
    category?: Category;
    websiteLink?: string;
    bookingLink?: string;
    ticketLink?: string;
    callLink?: string;
    imageUrls?: string[];
    startsAtISO?: string;
    endsAtISO?: string;
    status?: PromoStatus;
    priority?: number;
    budgetPerDay?: number;
}
export interface PromotedPlanRecord {
    promoId: string;
    venueId: string;
    provider?: string;
    plan: Plan;
    status: PromoStatus;
    priority: number;
    startsAtISO?: string;
    endsAtISO?: string;
    createdAtISO: string;
    updatedAtISO?: string;
}
export type SpecialStatus = "active" | "paused" | "ended";
export interface SpecialInput {
    venueId: string;
    provider?: string;
    headline: string;
    details?: string;
    startsAtISO?: string;
    endsAtISO?: string;
    status?: SpecialStatus;
    couponCode?: string;
    bookingLink?: string;
}
export interface SpecialRecord {
    specialId: string;
    venueId: string;
    provider?: string;
    headline: string;
    details?: string;
    couponCode?: string;
    bookingLink?: string;
    status: SpecialStatus;
    startsAtISO?: string;
    endsAtISO?: string;
    createdAtISO: string;
    updatedAtISO?: string;
}
export interface ListMerchantItemsOptions {
    limit?: number;
    cursor?: string | null;
    venueId?: string;
    status?: string;
    nowISO?: string;
}
export interface ListMerchantItemsOptionsNormalized {
    limit: number;
    cursor: string | null;
    venueId?: string;
    status?: string;
    nowISO?: string;
}
export interface ListPromotedResult {
    items: PromotedPlanRecord[];
    nextCursor?: string | null;
}
export interface ListSpecialsResult {
    items: SpecialRecord[];
    nextCursor?: string | null;
}
