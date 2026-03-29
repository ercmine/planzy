import { type Plan } from "../plans/plan.js";
import type { MerchantStore } from "./store.js";
import type { ListPromotedResult, ListSpecialsResult, PromotedPlanRecord, SpecialRecord } from "./types.js";
export declare class MerchantService {
    private readonly store;
    private readonly now;
    constructor(store: MerchantStore, deps?: {
        now?: () => Date;
    });
    createPromoted(input: unknown): Promise<PromotedPlanRecord>;
    updatePromoted(promoId: string, patchInput: unknown): Promise<PromotedPlanRecord>;
    listPromoted(opts?: unknown): Promise<ListPromotedResult>;
    deletePromoted(promoId: string): Promise<void>;
    createSpecial(input: unknown): Promise<SpecialRecord>;
    updateSpecial(specialId: string, patchInput: unknown): Promise<SpecialRecord>;
    listSpecials(opts?: unknown): Promise<ListSpecialsResult>;
    deleteSpecial(specialId: string): Promise<void>;
    specialsForVenue(venueId: string, now: Date): Promise<SpecialRecord[]>;
    attachSpecialsToPlans(plans: Plan[], now: Date): Promise<Plan[]>;
}
