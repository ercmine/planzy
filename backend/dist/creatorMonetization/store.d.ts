import type { CreatorMembershipPlan, CreatorMonetizationProfile, MonetizationAuditLog, TipIntent } from "./types.js";
export interface CreatorMonetizationStore {
    getProfile(creatorProfileId: string): CreatorMonetizationProfile | undefined;
    saveProfile(profile: CreatorMonetizationProfile): void;
    createTipIntent(tip: TipIntent): void;
    listTipsByCreator(creatorProfileId: string): TipIntent[];
    addAuditLog(log: MonetizationAuditLog): void;
    listAuditLogs(creatorProfileId: string): MonetizationAuditLog[];
    createMembershipPlan(plan: CreatorMembershipPlan): void;
    listMembershipPlans(creatorProfileId: string): CreatorMembershipPlan[];
}
