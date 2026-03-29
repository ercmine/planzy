export class MemoryCreatorMonetizationStore {
    profiles = new Map();
    tips = new Map();
    audits = new Map();
    membershipPlans = new Map();
    getProfile(creatorProfileId) { return this.profiles.get(creatorProfileId); }
    saveProfile(profile) { this.profiles.set(profile.creatorProfileId, profile); }
    createTipIntent(tip) { this.tips.set(tip.id, tip); }
    listTipsByCreator(creatorProfileId) { return [...this.tips.values()].filter((tip) => tip.creatorProfileId === creatorProfileId); }
    addAuditLog(log) { this.audits.set(log.creatorProfileId, [...(this.audits.get(log.creatorProfileId) ?? []), log]); }
    listAuditLogs(creatorProfileId) { return this.audits.get(creatorProfileId) ?? []; }
    createMembershipPlan(plan) {
        this.membershipPlans.set(plan.creatorProfileId, [...(this.membershipPlans.get(plan.creatorProfileId) ?? []), plan]);
    }
    listMembershipPlans(creatorProfileId) { return this.membershipPlans.get(creatorProfileId) ?? []; }
}
