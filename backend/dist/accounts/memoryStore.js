export class MemoryAccountsStore {
    users = new Map();
    roles = new Map();
    personalByUser = new Map();
    creatorByUser = new Map();
    businesses = new Map();
    memberships = new Map();
    listUsers() {
        return [...this.users.values()];
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    upsertUser(user) {
        this.users.set(user.id, user);
    }
    listRoles(userId) {
        return this.roles.get(userId) ?? [];
    }
    saveRole(assignment) {
        const rows = this.roles.get(assignment.userId) ?? [];
        if (!rows.some((row) => row.role === assignment.role)) {
            rows.push(assignment);
            this.roles.set(assignment.userId, rows);
        }
    }
    getPersonalProfileByUserId(userId) {
        return this.personalByUser.get(userId);
    }
    savePersonalProfile(profile) {
        this.personalByUser.set(profile.userId, profile);
    }
    getCreatorProfileByUserId(userId) {
        return this.creatorByUser.get(userId);
    }
    getCreatorProfileById(profileId) {
        return [...this.creatorByUser.values()].find((row) => row.id === profileId);
    }
    listCreatorProfiles() {
        return [...this.creatorByUser.values()];
    }
    saveCreatorProfile(profile) {
        this.creatorByUser.set(profile.userId, profile);
    }
    getBusinessProfile(id) {
        return this.businesses.get(id);
    }
    listBusinessProfiles() {
        return [...this.businesses.values()];
    }
    listBusinessProfilesByUserId(userId) {
        const ids = new Set([...this.memberships.values()].filter((row) => row.userId === userId && row.status === "ACTIVE").map((row) => row.businessProfileId));
        return [...ids].map((id) => this.businesses.get(id)).filter((row) => Boolean(row));
    }
    saveBusinessProfile(profile) {
        this.businesses.set(profile.id, profile);
    }
    getBusinessMembership(businessProfileId, userId) {
        return [...this.memberships.values()].find((row) => row.businessProfileId === businessProfileId && row.userId === userId && row.status === "ACTIVE");
    }
    listBusinessMemberships(businessProfileId) {
        return [...this.memberships.values()].filter((row) => row.businessProfileId === businessProfileId);
    }
    listBusinessMembershipsByUserId(userId) {
        return [...this.memberships.values()].filter((row) => row.userId === userId && row.status === "ACTIVE");
    }
    saveBusinessMembership(membership) {
        this.memberships.set(membership.id, membership);
    }
    deleteBusinessMembership(membershipId) {
        this.memberships.delete(membershipId);
    }
}
