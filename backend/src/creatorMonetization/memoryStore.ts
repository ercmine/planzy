import type { CreatorMembershipPlan, CreatorMonetizationProfile, MonetizationAuditLog, TipIntent } from "./types.js";
import type { CreatorMonetizationStore } from "./store.js";

export class MemoryCreatorMonetizationStore implements CreatorMonetizationStore {
  private readonly profiles = new Map<string, CreatorMonetizationProfile>();
  private readonly tips = new Map<string, TipIntent>();
  private readonly audits = new Map<string, MonetizationAuditLog[]>();
  private readonly membershipPlans = new Map<string, CreatorMembershipPlan[]>();

  getProfile(creatorProfileId: string): CreatorMonetizationProfile | undefined { return this.profiles.get(creatorProfileId); }
  saveProfile(profile: CreatorMonetizationProfile): void { this.profiles.set(profile.creatorProfileId, profile); }
  createTipIntent(tip: TipIntent): void { this.tips.set(tip.id, tip); }
  listTipsByCreator(creatorProfileId: string): TipIntent[] { return [...this.tips.values()].filter((tip) => tip.creatorProfileId === creatorProfileId); }
  addAuditLog(log: MonetizationAuditLog): void { this.audits.set(log.creatorProfileId, [...(this.audits.get(log.creatorProfileId) ?? []), log]); }
  listAuditLogs(creatorProfileId: string): MonetizationAuditLog[] { return this.audits.get(creatorProfileId) ?? []; }
  createMembershipPlan(plan: CreatorMembershipPlan): void {
    this.membershipPlans.set(plan.creatorProfileId, [...(this.membershipPlans.get(plan.creatorProfileId) ?? []), plan]);
  }
  listMembershipPlans(creatorProfileId: string): CreatorMembershipPlan[] { return this.membershipPlans.get(creatorProfileId) ?? []; }
}
