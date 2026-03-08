export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED"
}

export enum UserRole {
  USER = "USER",
  CREATOR = "CREATOR",
  BUSINESS_OWNER = "BUSINESS_OWNER",
  BUSINESS_MANAGER = "BUSINESS_MANAGER",
  ADMIN = "ADMIN",
  MODERATOR = "MODERATOR"
}

export enum ProfileType {
  PERSONAL = "PERSONAL",
  CREATOR = "CREATOR",
  BUSINESS = "BUSINESS"
}

export enum VerificationStatus {
  UNVERIFIED = "UNVERIFIED",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED"
}

export enum ProfileVisibility {
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC"
}

export enum BusinessMembershipRole {
  OWNER = "OWNER",
  MANAGER = "MANAGER",
  EDITOR = "EDITOR",
  VIEWER = "VIEWER"
}

export enum MembershipStatus {
  ACTIVE = "ACTIVE",
  INVITED = "INVITED",
  DISABLED = "DISABLED"
}

export interface UserIdentity {
  id: string;
  email?: string;
  phone?: string;
  authProvider?: string;
  authProviderUserId?: string;
  status: UserStatus;
  moderationFlags: string[];
  activeProfileType: ProfileType;
  activeProfileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  userId: string;
  role: UserRole;
  assignedAt: string;
}

export interface PersonalProfile {
  id: string;
  userId: string;
  displayName: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  visibility: ProfileVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface CreatorProfile {
  id: string;
  userId: string;
  creatorName: string;
  handle?: string;
  bio?: string;
  category?: string;
  links: string[];
  avatarUrl?: string;
  bannerUrl?: string;
  verificationStatus: VerificationStatus;
  visibility: ProfileVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProfile {
  id: string;
  slug: string;
  businessName: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  address?: string;
  verificationStatus: VerificationStatus;
  visibility: ProfileVisibility;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessMembership {
  id: string;
  businessProfileId: string;
  userId: string;
  role: BusinessMembershipRole;
  status: MembershipStatus;
  invitedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActingContext {
  profileType: ProfileType;
  profileId: string;
}

export interface ActorContextResolved {
  userId: string;
  profileType: ProfileType;
  profileId: string;
  roles: UserRole[];
  businessMembershipRole?: BusinessMembershipRole;
}

export enum PermissionAction {
  CREATE_CREATOR_PROFILE = "CREATE_CREATOR_PROFILE",
  ACT_AS_PROFILE = "ACT_AS_PROFILE",
  EDIT_CREATOR_PROFILE = "EDIT_CREATOR_PROFILE",
  MANAGE_BUSINESS_MEMBERS = "MANAGE_BUSINESS_MEMBERS",
  BUSINESS_REPLY = "BUSINESS_REPLY",
  PUBLISH_CREATOR_CONTENT = "PUBLISH_CREATOR_CONTENT",
  ACCESS_BUSINESS_ANALYTICS = "ACCESS_BUSINESS_ANALYTICS"
}

export interface AuthorizationDecision {
  allowed: boolean;
  reasonCode: string;
  message: string;
  actingProfileType?: ProfileType;
  requiredRole?: UserRole | BusinessMembershipRole;
}

export interface IdentitySummary {
  user: UserIdentity;
  roles: UserRole[];
  personalProfile: PersonalProfile;
  creatorProfile?: CreatorProfile;
  businessProfiles: BusinessProfile[];
}
