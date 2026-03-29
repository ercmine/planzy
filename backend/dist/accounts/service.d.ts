import { AccountType } from "../subscriptions/types.js";
import type { AccountsStore } from "./store.js";
import { BusinessMembershipRole, PermissionAction, UserStatus, VerificationStatus, CreatorProfileStatus, type ActingContext, type ActorContextResolved, type AuthorizationDecision, type BusinessMembership, type BusinessProfile, type CreatorProfile, type IdentitySummary, type UserIdentity } from "./types.js";
export declare class AccountsService {
    private readonly store;
    constructor(store: AccountsStore);
    ensureUserIdentity(userId: string, email?: string): UserIdentity;
    listUsers(): UserIdentity[];
    listCreatorProfiles(): CreatorProfile[];
    listBusinessProfiles(): BusinessProfile[];
    getIdentitySummary(userId: string): IdentitySummary;
    createCreatorProfile(userId: string, input: {
        creatorName: string;
        handle?: string;
        bio?: string;
        category?: string;
    }): CreatorProfile;
    createBusinessProfile(userId: string, input: {
        businessName: string;
        slug: string;
        description?: string;
    }): BusinessProfile;
    getCreatorProfileById(profileId: string): CreatorProfile | undefined;
    getBusinessProfileById(profileId: string): BusinessProfile | undefined;
    listActingContexts(userId: string): ActingContext[];
    resolveActingContext(userId: string, requested?: ActingContext): ActorContextResolved;
    switchActiveContext(userId: string, requested: ActingContext): ActorContextResolved;
    authorizeAction(actor: ActorContextResolved, action: PermissionAction): AuthorizationDecision;
    updateUserStatus(userId: string, status: UserStatus): UserIdentity;
    addUserModerationFlag(userId: string, flag: string): UserIdentity;
    removeUserModerationFlag(userId: string, flag: string): UserIdentity;
    updateCreatorProfileStatus(profileId: string, status: CreatorProfileStatus): CreatorProfile;
    updateCreatorVerificationStatus(profileId: string, verificationStatus: VerificationStatus): CreatorProfile;
    updateBusinessVerificationStatus(profileId: string, verificationStatus: VerificationStatus): BusinessProfile;
    inviteBusinessMember(actor: ActorContextResolved, input: {
        businessProfileId: string;
        userId: string;
        role: BusinessMembershipRole;
    }): BusinessMembership;
    listBusinessMembers(actor: ActorContextResolved, businessProfileId: string): BusinessMembership[];
    resolveSubscriptionTarget(actor: ActorContextResolved): {
        accountId: string;
        accountType: AccountType;
    };
}
