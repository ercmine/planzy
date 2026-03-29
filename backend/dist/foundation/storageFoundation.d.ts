import type { EntitlementKey, EntitlementValue, PlanDefinition } from "../subscriptions/types.js";
export type RoleAssignmentStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type ClaimStatus = "PENDING" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "REVOKED";
export interface RoleAssignment {
    userId: string;
    roleKey: string;
    status: RoleAssignmentStatus;
    grantSource: "SELF_SERVICE" | "ADMIN" | "SYSTEM" | "CLAIM_FLOW";
    grantedAt: string;
}
export interface PlaceSourceLink {
    placeId: string;
    provider: string;
    providerPlaceId: string;
    linkedAt: string;
}
export interface EntitlementGrant {
    principalType: "USER" | "CREATOR" | "BUSINESS";
    principalId: string;
    key: EntitlementKey;
    value: EntitlementValue;
    sourceType: "PLAN" | "MANUAL" | "PROMO" | "SYSTEM";
    status: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "REVOKED";
    effectiveFrom: string;
    effectiveTo?: string;
}
export interface BusinessClaim {
    id: string;
    placeId: string;
    businessProfileId: string;
    status: ClaimStatus;
    submittedAt: string;
    reviewedAt?: string;
}
export interface MediaAttachment {
    mediaAssetId: string;
    targetType: "PLACE" | "REVIEW" | "CREATOR_ASSET";
    targetId: string;
    displayOrder: number;
}
export declare class StorageFoundationService {
    private readonly roleAssignments;
    private readonly placeSourceLinks;
    private readonly entitlementGrants;
    private readonly claims;
    private readonly mediaAttachments;
    getPlanByCode(code: string): PlanDefinition | undefined;
    isKnownEntitlementKey(key: string): key is EntitlementKey;
    assignRole(input: Omit<RoleAssignment, "grantedAt"> & {
        grantedAt?: string;
    }): RoleAssignment;
    hasRole(userId: string, roleKey: string): boolean;
    linkPlaceSource(link: PlaceSourceLink): PlaceSourceLink;
    grantEntitlement(grant: EntitlementGrant): EntitlementGrant;
    resolveEntitlement(input: {
        principalType: "USER" | "CREATOR" | "BUSINESS";
        principalId: string;
        key: EntitlementKey;
        at?: string;
        planCode?: string;
    }): EntitlementValue | undefined;
    createClaim(claim: BusinessClaim): BusinessClaim;
    transitionClaim(claimId: string, nextStatus: ClaimStatus): BusinessClaim;
    attachMedia(input: MediaAttachment): MediaAttachment;
    listMediaForTarget(targetType: MediaAttachment["targetType"], targetId: string): MediaAttachment[];
}
