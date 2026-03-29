import type { CreatorMembershipPlan, CreatorMonetizationProfile, MonetizationAuditLog, TipIntent } from "./types.js";
import type { CreatorMonetizationStore } from "./store.js";
export declare class MemoryCreatorMonetizationStore implements CreatorMonetizationStore {
    private readonly profiles;
    private readonly tips;
    private readonly audits;
    private readonly membershipPlans;
    getProfile(creatorProfileId: string): CreatorMonetizationProfile | undefined;
    saveProfile(profile: CreatorMonetizationProfile): void;
    createTipIntent(tip: TipIntent): void;
    listTipsByCreator(creatorProfileId: string): TipIntent[];
    addAuditLog(log: MonetizationAuditLog): void;
    listAuditLogs(creatorProfileId: string): MonetizationAuditLog[];
    createMembershipPlan(plan: CreatorMembershipPlan): void;
    listMembershipPlans(creatorProfileId: string): CreatorMembershipPlan[];
}
