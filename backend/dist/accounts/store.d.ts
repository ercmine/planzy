import type { BusinessMembership, BusinessProfile, CreatorProfile, PersonalProfile, UserIdentity, UserRoleAssignment } from "./types.js";
export interface AccountsStore {
    listUsers(): UserIdentity[];
    getUser(userId: string): UserIdentity | undefined;
    upsertUser(user: UserIdentity): void;
    listRoles(userId: string): UserRoleAssignment[];
    saveRole(assignment: UserRoleAssignment): void;
    getPersonalProfileByUserId(userId: string): PersonalProfile | undefined;
    savePersonalProfile(profile: PersonalProfile): void;
    getCreatorProfileByUserId(userId: string): CreatorProfile | undefined;
    getCreatorProfileById(profileId: string): CreatorProfile | undefined;
    listCreatorProfiles(): CreatorProfile[];
    saveCreatorProfile(profile: CreatorProfile): void;
    getBusinessProfile(id: string): BusinessProfile | undefined;
    listBusinessProfiles(): BusinessProfile[];
    listBusinessProfilesByUserId(userId: string): BusinessProfile[];
    saveBusinessProfile(profile: BusinessProfile): void;
    getBusinessMembership(businessProfileId: string, userId: string): BusinessMembership | undefined;
    listBusinessMemberships(businessProfileId: string): BusinessMembership[];
    listBusinessMembershipsByUserId(userId: string): BusinessMembership[];
    saveBusinessMembership(membership: BusinessMembership): void;
    deleteBusinessMembership(membershipId: string): void;
}
