import { randomUUID } from "node:crypto";
import { AccountType } from "../subscriptions/types.js";
import { BusinessMembershipRole, MembershipStatus, PermissionAction, ProfileType, ProfileVisibility, UserRole, UserStatus, VerificationStatus, CreatorProfileStatus } from "./types.js";
export class AccountsService {
    store;
    constructor(store) {
        this.store = store;
    }
    ensureUserIdentity(userId, email) {
        const now = new Date().toISOString();
        const existing = this.store.getUser(userId);
        if (existing)
            return existing;
        const personalProfile = {
            id: `pp_${randomUUID()}`,
            userId,
            displayName: "Perbug User",
            visibility: ProfileVisibility.PUBLIC,
            createdAt: now,
            updatedAt: now
        };
        const user = {
            id: userId,
            email,
            status: UserStatus.ACTIVE,
            moderationFlags: [],
            activeProfileType: ProfileType.PERSONAL,
            activeProfileId: personalProfile.id,
            createdAt: now,
            updatedAt: now
        };
        this.store.upsertUser(user);
        this.store.savePersonalProfile(personalProfile);
        this.store.saveRole({ userId, role: UserRole.USER, assignedAt: now });
        return user;
    }
    listUsers() {
        return this.store.listUsers();
    }
    listCreatorProfiles() {
        return this.store.listCreatorProfiles();
    }
    listBusinessProfiles() {
        return this.store.listBusinessProfiles();
    }
    getIdentitySummary(userId) {
        const user = this.ensureUserIdentity(userId);
        const personalProfile = this.store.getPersonalProfileByUserId(userId);
        if (!personalProfile)
            throw new Error("Personal profile not found");
        return {
            user,
            roles: this.store.listRoles(userId).map((row) => row.role),
            personalProfile,
            creatorProfile: this.store.getCreatorProfileByUserId(userId),
            businessProfiles: this.store.listBusinessProfilesByUserId(userId)
        };
    }
    createCreatorProfile(userId, input) {
        this.ensureUserIdentity(userId);
        const existing = this.store.getCreatorProfileByUserId(userId);
        if (existing) {
            throw new Error("CREATOR_PROFILE_ALREADY_EXISTS");
        }
        const now = new Date().toISOString();
        const profile = {
            id: `cp_${randomUUID()}`,
            userId,
            creatorName: input.creatorName,
            displayName: input.creatorName,
            slug: (input.handle ?? input.creatorName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `creator-${userId.toLowerCase()}`,
            handle: input.handle,
            bio: input.bio,
            websiteUrl: undefined,
            category: input.category,
            tags: input.category ? [input.category] : [],
            socialLinks: [],
            followerCount: 0,
            followingCount: 0,
            publicReviewsCount: 0,
            publicGuidesCount: 0,
            badges: [],
            status: CreatorProfileStatus.ACTIVE,
            isPublic: true,
            verificationStatus: VerificationStatus.UNVERIFIED,
            visibility: ProfileVisibility.PUBLIC,
            createdAt: now,
            updatedAt: now
        };
        this.store.saveCreatorProfile(profile);
        this.store.saveRole({ userId, role: UserRole.CREATOR, assignedAt: now });
        return profile;
    }
    createBusinessProfile(userId, input) {
        this.ensureUserIdentity(userId);
        const now = new Date().toISOString();
        const business = {
            id: `bp_${randomUUID()}`,
            slug: input.slug,
            businessName: input.businessName,
            description: input.description,
            verificationStatus: VerificationStatus.UNVERIFIED,
            visibility: ProfileVisibility.PUBLIC,
            createdByUserId: userId,
            updatedByUserId: userId,
            createdAt: now,
            updatedAt: now
        };
        this.store.saveBusinessProfile(business);
        const ownerMembership = {
            id: `bm_${randomUUID()}`,
            businessProfileId: business.id,
            userId,
            role: BusinessMembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            invitedByUserId: userId,
            createdAt: now,
            updatedAt: now
        };
        this.store.saveBusinessMembership(ownerMembership);
        this.store.saveRole({ userId, role: UserRole.BUSINESS_OWNER, assignedAt: now });
        return business;
    }
    getCreatorProfileById(profileId) {
        return this.store.getCreatorProfileById(profileId);
    }
    getBusinessProfileById(profileId) {
        return this.store.getBusinessProfile(profileId);
    }
    listActingContexts(userId) {
        const identity = this.getIdentitySummary(userId);
        const contexts = [{ profileType: ProfileType.PERSONAL, profileId: identity.personalProfile.id }];
        if (identity.creatorProfile) {
            contexts.push({ profileType: ProfileType.CREATOR, profileId: identity.creatorProfile.id });
        }
        for (const business of identity.businessProfiles) {
            contexts.push({ profileType: ProfileType.BUSINESS, profileId: business.id });
        }
        return contexts;
    }
    resolveActingContext(userId, requested) {
        const identity = this.getIdentitySummary(userId);
        const selected = requested ?? {
            profileType: identity.user.activeProfileType,
            profileId: identity.user.activeProfileId
        };
        if (selected.profileType === ProfileType.PERSONAL && selected.profileId === identity.personalProfile.id) {
            return { userId, profileType: selected.profileType, profileId: selected.profileId, roles: identity.roles };
        }
        if (selected.profileType === ProfileType.CREATOR && identity.creatorProfile && selected.profileId === identity.creatorProfile.id) {
            return { userId, profileType: selected.profileType, profileId: selected.profileId, roles: identity.roles };
        }
        if (selected.profileType === ProfileType.BUSINESS) {
            const membership = this.store.getBusinessMembership(selected.profileId, userId);
            if (!membership) {
                throw new Error("BUSINESS_CONTEXT_NOT_ALLOWED");
            }
            return {
                userId,
                profileType: selected.profileType,
                profileId: selected.profileId,
                roles: identity.roles,
                businessMembershipRole: membership.role
            };
        }
        throw new Error("ACTING_CONTEXT_NOT_ALLOWED");
    }
    switchActiveContext(userId, requested) {
        const resolved = this.resolveActingContext(userId, requested);
        const user = this.ensureUserIdentity(userId);
        this.store.upsertUser({ ...user, activeProfileType: requested.profileType, activeProfileId: requested.profileId, updatedAt: new Date().toISOString() });
        return resolved;
    }
    authorizeAction(actor, action) {
        if (action === PermissionAction.CREATE_CREATOR_PROFILE) {
            if (this.store.getCreatorProfileByUserId(actor.userId)) {
                return { allowed: false, reasonCode: "ALREADY_EXISTS", message: "Creator profile already exists" };
            }
            return { allowed: true, reasonCode: "ALLOWED", message: "ok", actingProfileType: actor.profileType };
        }
        if (action === PermissionAction.BUSINESS_REPLY) {
            if (actor.profileType !== ProfileType.BUSINESS) {
                return { allowed: false, reasonCode: "CONTEXT_REQUIRED", message: "Business context required", requiredRole: BusinessMembershipRole.EDITOR };
            }
            if (![BusinessMembershipRole.OWNER, BusinessMembershipRole.MANAGER, BusinessMembershipRole.EDITOR].includes(actor.businessMembershipRole)) {
                return { allowed: false, reasonCode: "ROLE_REQUIRED", message: "Role cannot post replies", requiredRole: BusinessMembershipRole.EDITOR };
            }
            return { allowed: true, reasonCode: "ALLOWED", message: "ok", actingProfileType: ProfileType.BUSINESS };
        }
        if (action === PermissionAction.MANAGE_BUSINESS_MEMBERS) {
            if (actor.profileType !== ProfileType.BUSINESS) {
                return { allowed: false, reasonCode: "CONTEXT_REQUIRED", message: "Business context required", requiredRole: BusinessMembershipRole.MANAGER };
            }
            if (![BusinessMembershipRole.OWNER, BusinessMembershipRole.MANAGER].includes(actor.businessMembershipRole)) {
                return { allowed: false, reasonCode: "ROLE_REQUIRED", message: "Insufficient membership role", requiredRole: BusinessMembershipRole.MANAGER };
            }
            return { allowed: true, reasonCode: "ALLOWED", message: "ok", actingProfileType: ProfileType.BUSINESS };
        }
        if (action === PermissionAction.PUBLISH_CREATOR_CONTENT) {
            if (actor.profileType !== ProfileType.CREATOR) {
                return { allowed: false, reasonCode: "CONTEXT_REQUIRED", message: "Creator context required", requiredRole: UserRole.CREATOR };
            }
            return { allowed: true, reasonCode: "ALLOWED", message: "ok", actingProfileType: ProfileType.CREATOR };
        }
        return { allowed: true, reasonCode: "ALLOWED", message: "ok", actingProfileType: actor.profileType };
    }
    updateUserStatus(userId, status) {
        const user = this.ensureUserIdentity(userId);
        const next = { ...user, status, updatedAt: new Date().toISOString() };
        this.store.upsertUser(next);
        return next;
    }
    addUserModerationFlag(userId, flag) {
        const user = this.ensureUserIdentity(userId);
        const next = { ...user, moderationFlags: [...new Set([...(user.moderationFlags ?? []), flag])], updatedAt: new Date().toISOString() };
        this.store.upsertUser(next);
        return next;
    }
    removeUserModerationFlag(userId, flag) {
        const user = this.ensureUserIdentity(userId);
        const next = { ...user, moderationFlags: (user.moderationFlags ?? []).filter((item) => item !== flag), updatedAt: new Date().toISOString() };
        this.store.upsertUser(next);
        return next;
    }
    updateCreatorProfileStatus(profileId, status) {
        const profile = this.store.getCreatorProfileById(profileId);
        if (!profile)
            throw new Error("CREATOR_PROFILE_NOT_FOUND");
        const next = { ...profile, status, updatedAt: new Date().toISOString() };
        this.store.saveCreatorProfile(next);
        return next;
    }
    updateCreatorVerificationStatus(profileId, verificationStatus) {
        const profile = this.store.getCreatorProfileById(profileId);
        if (!profile)
            throw new Error("CREATOR_PROFILE_NOT_FOUND");
        const next = { ...profile, verificationStatus, updatedAt: new Date().toISOString() };
        this.store.saveCreatorProfile(next);
        return next;
    }
    updateBusinessVerificationStatus(profileId, verificationStatus) {
        const profile = this.store.getBusinessProfile(profileId);
        if (!profile)
            throw new Error("BUSINESS_PROFILE_NOT_FOUND");
        const next = { ...profile, verificationStatus, updatedAt: new Date().toISOString() };
        this.store.saveBusinessProfile(next);
        return next;
    }
    inviteBusinessMember(actor, input) {
        const decision = this.authorizeAction(actor, PermissionAction.MANAGE_BUSINESS_MEMBERS);
        if (!decision.allowed)
            throw new Error(decision.reasonCode);
        if (actor.profileId !== input.businessProfileId) {
            throw new Error("BUSINESS_CONTEXT_MISMATCH");
        }
        if (actor.businessMembershipRole === BusinessMembershipRole.MANAGER && [BusinessMembershipRole.OWNER, BusinessMembershipRole.MANAGER].includes(input.role)) {
            throw new Error("ROLE_ESCALATION_BLOCKED");
        }
        const now = new Date().toISOString();
        const member = {
            id: `bm_${randomUUID()}`,
            businessProfileId: input.businessProfileId,
            userId: input.userId,
            role: input.role,
            status: MembershipStatus.ACTIVE,
            invitedByUserId: actor.userId,
            createdAt: now,
            updatedAt: now
        };
        this.ensureUserIdentity(input.userId);
        this.store.saveBusinessMembership(member);
        if (input.role === BusinessMembershipRole.MANAGER) {
            this.store.saveRole({ userId: input.userId, role: UserRole.BUSINESS_MANAGER, assignedAt: now });
        }
        return member;
    }
    listBusinessMembers(actor, businessProfileId) {
        const canAct = this.resolveActingContext(actor.userId, { profileType: ProfileType.BUSINESS, profileId: businessProfileId });
        if (!canAct)
            throw new Error("BUSINESS_CONTEXT_NOT_ALLOWED");
        return this.store.listBusinessMemberships(businessProfileId);
    }
    resolveSubscriptionTarget(actor) {
        if (actor.profileType === ProfileType.CREATOR) {
            return { accountId: actor.profileId, accountType: AccountType.CREATOR };
        }
        if (actor.profileType === ProfileType.BUSINESS) {
            return { accountId: actor.profileId, accountType: AccountType.BUSINESS };
        }
        return { accountId: actor.userId, accountType: AccountType.USER };
    }
}
