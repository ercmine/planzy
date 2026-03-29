import { RetentionPolicy } from "../retention/policy.js";
import type { MerchantStore } from "./store.js";
import type { ListMerchantItemsOptions, ListPromotedResult, ListSpecialsResult, PromotedPlanRecord, SpecialRecord } from "./types.js";
export declare class MemoryMerchantStore implements MerchantStore {
    private readonly promoted;
    private readonly specials;
    private readonly retentionPolicy;
    constructor(retentionPolicy?: RetentionPolicy);
    createPromoted(record: PromotedPlanRecord): Promise<void>;
    updatePromoted(promoId: string, patch: Partial<PromotedPlanRecord>): Promise<void>;
    listPromoted(opts?: ListMerchantItemsOptions): Promise<ListPromotedResult>;
    getPromoted(promoId: string): Promise<PromotedPlanRecord | null>;
    deletePromoted(promoId: string): Promise<void>;
    createSpecial(record: SpecialRecord): Promise<void>;
    updateSpecial(specialId: string, patch: Partial<SpecialRecord>): Promise<void>;
    listSpecials(opts?: ListMerchantItemsOptions): Promise<ListSpecialsResult>;
    getSpecial(specialId: string): Promise<SpecialRecord | null>;
    deleteSpecial(specialId: string): Promise<void>;
    prunePromos(maxAgeMs?: number, now?: Date): number;
    pruneSpecials(maxAgeMs?: number, now?: Date): number;
}
