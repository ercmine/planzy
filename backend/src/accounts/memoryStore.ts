import type { AccountsStore } from "./store.js";
import type {
  BusinessMembership,
  BusinessProfile,
  CreatorProfile,
  PersonalProfile,
  UserIdentity,
  UserRoleAssignment
} from "./types.js";

export class MemoryAccountsStore implements AccountsStore {
  private readonly users = new Map<string, UserIdentity>();
  private readonly roles = new Map<string, UserRoleAssignment[]>();
  private readonly personalByUser = new Map<string, PersonalProfile>();
  private readonly creatorByUser = new Map<string, CreatorProfile>();
  private readonly businesses = new Map<string, BusinessProfile>();
  private readonly memberships = new Map<string, BusinessMembership>();


  listUsers(): UserIdentity[] {
    return [...this.users.values()];
  }

  getUser(userId: string): UserIdentity | undefined {
    return this.users.get(userId);
  }

  upsertUser(user: UserIdentity): void {
    this.users.set(user.id, user);
  }

  listRoles(userId: string): UserRoleAssignment[] {
    return this.roles.get(userId) ?? [];
  }

  saveRole(assignment: UserRoleAssignment): void {
    const rows = this.roles.get(assignment.userId) ?? [];
    if (!rows.some((row) => row.role === assignment.role)) {
      rows.push(assignment);
      this.roles.set(assignment.userId, rows);
    }
  }

  getPersonalProfileByUserId(userId: string): PersonalProfile | undefined {
    return this.personalByUser.get(userId);
  }

  savePersonalProfile(profile: PersonalProfile): void {
    this.personalByUser.set(profile.userId, profile);
  }

  getCreatorProfileByUserId(userId: string): CreatorProfile | undefined {
    return this.creatorByUser.get(userId);
  }

  getCreatorProfileById(profileId: string): CreatorProfile | undefined {
    return [...this.creatorByUser.values()].find((row) => row.id === profileId);
  }

  listCreatorProfiles(): CreatorProfile[] {
    return [...this.creatorByUser.values()];
  }

  saveCreatorProfile(profile: CreatorProfile): void {
    this.creatorByUser.set(profile.userId, profile);
  }

  getBusinessProfile(id: string): BusinessProfile | undefined {
    return this.businesses.get(id);
  }

  listBusinessProfiles(): BusinessProfile[] {
    return [...this.businesses.values()];
  }

  listBusinessProfilesByUserId(userId: string): BusinessProfile[] {
    const ids = new Set(
      [...this.memberships.values()].filter((row) => row.userId === userId && row.status === "ACTIVE").map((row) => row.businessProfileId)
    );
    return [...ids].map((id) => this.businesses.get(id)).filter((row): row is BusinessProfile => Boolean(row));
  }

  saveBusinessProfile(profile: BusinessProfile): void {
    this.businesses.set(profile.id, profile);
  }

  getBusinessMembership(businessProfileId: string, userId: string): BusinessMembership | undefined {
    return [...this.memberships.values()].find((row) => row.businessProfileId === businessProfileId && row.userId === userId && row.status === "ACTIVE");
  }

  listBusinessMemberships(businessProfileId: string): BusinessMembership[] {
    return [...this.memberships.values()].filter((row) => row.businessProfileId === businessProfileId);
  }

  listBusinessMembershipsByUserId(userId: string): BusinessMembership[] {
    return [...this.memberships.values()].filter((row) => row.userId === userId && row.status === "ACTIVE");
  }

  saveBusinessMembership(membership: BusinessMembership): void {
    this.memberships.set(membership.id, membership);
  }

  deleteBusinessMembership(membershipId: string): void {
    this.memberships.delete(membershipId);
  }
}
