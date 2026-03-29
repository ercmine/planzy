import { describe, expect, it } from "vitest";
import { MemoryAccountsStore } from "../memoryStore.js";
import { AccountsService } from "../service.js";
import { BusinessMembershipRole, PermissionAction, ProfileType } from "../types.js";
describe("accounts service", () => {
    it("bootstraps personal profile and supports creator once", () => {
        const service = new AccountsService(new MemoryAccountsStore());
        const summary = service.getIdentitySummary("u1");
        expect(summary.personalProfile.userId).toBe("u1");
        expect(summary.creatorProfile).toBeUndefined();
        service.createCreatorProfile("u1", { creatorName: "Creator One" });
        expect(service.getIdentitySummary("u1").creatorProfile?.creatorName).toBe("Creator One");
        expect(() => service.createCreatorProfile("u1", { creatorName: "Again" })).toThrow("CREATOR_PROFILE_ALREADY_EXISTS");
    });
    it("enforces business context and member role rules", () => {
        const service = new AccountsService(new MemoryAccountsStore());
        const business = service.createBusinessProfile("owner", { businessName: "Cafe", slug: "cafe" });
        const ownerActor = service.resolveActingContext("owner", { profileType: ProfileType.BUSINESS, profileId: business.id });
        const member = service.inviteBusinessMember(ownerActor, {
            businessProfileId: business.id,
            userId: "manager",
            role: BusinessMembershipRole.MANAGER
        });
        expect(member.role).toBe(BusinessMembershipRole.MANAGER);
        const managerActor = service.resolveActingContext("manager", { profileType: ProfileType.BUSINESS, profileId: business.id });
        expect(service.authorizeAction(managerActor, PermissionAction.BUSINESS_REPLY).allowed).toBe(true);
        expect(() => service.inviteBusinessMember(managerActor, {
            businessProfileId: business.id,
            userId: "viewer",
            role: BusinessMembershipRole.OWNER
        })).toThrow("ROLE_ESCALATION_BLOCKED");
        service.getIdentitySummary("outsider");
        expect(() => service.resolveActingContext("outsider", { profileType: ProfileType.BUSINESS, profileId: business.id })).toThrow("BUSINESS_CONTEXT_NOT_ALLOWED");
    });
    it("resolves subscription targets by acting context", () => {
        const service = new AccountsService(new MemoryAccountsStore());
        const creator = service.createCreatorProfile("u2", { creatorName: "c" });
        const business = service.createBusinessProfile("u2", { businessName: "Biz", slug: "biz" });
        const creatorActor = service.resolveActingContext("u2", { profileType: ProfileType.CREATOR, profileId: creator.id });
        const bizActor = service.resolveActingContext("u2", { profileType: ProfileType.BUSINESS, profileId: business.id });
        const personalActor = service.resolveActingContext("u2", { profileType: ProfileType.PERSONAL, profileId: service.getIdentitySummary("u2").personalProfile.id });
        expect(service.resolveSubscriptionTarget(creatorActor)).toMatchObject({ accountType: "CREATOR", accountId: creator.id });
        expect(service.resolveSubscriptionTarget(bizActor)).toMatchObject({ accountType: "BUSINESS", accountId: business.id });
        expect(service.resolveSubscriptionTarget(personalActor)).toMatchObject({ accountType: "USER", accountId: "u2" });
    });
});
