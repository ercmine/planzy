export interface PlanDeepLinksV2 {
    mapsLink?: string;
    websiteLink?: string;
    callLink?: string;
    bookingLink?: string;
    ticketLink?: string;
}
export type PlanDeepLinksLegacy = {
    maps?: string;
    website?: string;
    call?: string;
    booking?: string;
    ticket?: string;
};
export type PlanDeepLinksAny = PlanDeepLinksV2 | PlanDeepLinksLegacy | (PlanDeepLinksV2 & PlanDeepLinksLegacy);
