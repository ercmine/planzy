import { PLAN_CATALOG, getPlan } from "../subscriptions/catalog.js";
import { ENTITLEMENT_DEFINITIONS } from "../subscriptions/entitlementDefinitions.js";
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

export class StorageFoundationService {
  private readonly roleAssignments = new Map<string, RoleAssignment[]>();
  private readonly placeSourceLinks = new Map<string, PlaceSourceLink>();
  private readonly entitlementGrants = new Map<string, EntitlementGrant[]>();
  private readonly claims = new Map<string, BusinessClaim>();
  private readonly mediaAttachments = new Map<string, MediaAttachment[]>();

  getPlanByCode(code: string): PlanDefinition | undefined {
    return PLAN_CATALOG.find((plan) => plan.code === code);
  }

  isKnownEntitlementKey(key: string): key is EntitlementKey {
    return ENTITLEMENT_DEFINITIONS.some((item) => item.key === key);
  }

  assignRole(input: Omit<RoleAssignment, "grantedAt"> & { grantedAt?: string }): RoleAssignment {
    const next: RoleAssignment = { ...input, grantedAt: input.grantedAt ?? new Date().toISOString() };
    const list = this.roleAssignments.get(input.userId) ?? [];
    const existing = list.find((item) => item.roleKey === input.roleKey && item.status === "ACTIVE");
    if (existing && next.status === "ACTIVE") return existing;
    list.push(next);
    this.roleAssignments.set(input.userId, list);
    return next;
  }

  hasRole(userId: string, roleKey: string): boolean {
    return (this.roleAssignments.get(userId) ?? []).some((item) => item.roleKey === roleKey && item.status === "ACTIVE");
  }

  linkPlaceSource(link: PlaceSourceLink): PlaceSourceLink {
    const key = `${link.provider}:${link.providerPlaceId}`;
    const prior = this.placeSourceLinks.get(key);
    if (prior && prior.placeId !== link.placeId) {
      throw new Error("Provider source is already linked to a different place");
    }
    this.placeSourceLinks.set(key, link);
    return link;
  }

  grantEntitlement(grant: EntitlementGrant): EntitlementGrant {
    const key = `${grant.principalType}:${grant.principalId}`;
    const list = this.entitlementGrants.get(key) ?? [];
    list.push(grant);
    this.entitlementGrants.set(key, list);
    return grant;
  }

  resolveEntitlement(input: { principalType: "USER" | "CREATOR" | "BUSINESS"; principalId: string; key: EntitlementKey; at?: string; planCode?: string }): EntitlementValue | undefined {
    const at = input.at ? new Date(input.at) : new Date();
    const scoped = (this.entitlementGrants.get(`${input.principalType}:${input.principalId}`) ?? [])
      .filter((grant) => grant.key === input.key)
      .filter((grant) => (grant.status === "ACTIVE" || grant.status === "SCHEDULED"))
      .filter((grant) => new Date(grant.effectiveFrom) <= at)
      .filter((grant) => !grant.effectiveTo || new Date(grant.effectiveTo) >= at)
      .sort((a, b) => a.sourceType === "MANUAL" ? -1 : b.sourceType === "MANUAL" ? 1 : 0);
    if (scoped[0]) return scoped[0].value;
    if (input.planCode) {
      const plan = this.getPlanByCode(input.planCode) ?? getPlan(input.planCode);
      return plan?.entitlements[input.key];
    }
    return undefined;
  }

  createClaim(claim: BusinessClaim): BusinessClaim {
    for (const row of this.claims.values()) {
      if (row.placeId === claim.placeId && row.businessProfileId === claim.businessProfileId && ["PENDING", "UNDER_REVIEW"].includes(row.status)) {
        throw new Error("An active claim already exists for this business/place pair");
      }
    }
    this.claims.set(claim.id, claim);
    return claim;
  }

  transitionClaim(claimId: string, nextStatus: ClaimStatus): BusinessClaim {
    const current = this.claims.get(claimId);
    if (!current) throw new Error("Claim not found");
    const updated: BusinessClaim = { ...current, status: nextStatus, reviewedAt: new Date().toISOString() };
    this.claims.set(claimId, updated);
    return updated;
  }

  attachMedia(input: MediaAttachment): MediaAttachment {
    const key = `${input.targetType}:${input.targetId}`;
    const list = this.mediaAttachments.get(key) ?? [];
    if (list.some((row) => row.mediaAssetId === input.mediaAssetId)) return input;
    list.push(input);
    list.sort((a, b) => a.displayOrder - b.displayOrder);
    this.mediaAttachments.set(key, list);
    return input;
  }

  listMediaForTarget(targetType: MediaAttachment["targetType"], targetId: string): MediaAttachment[] {
    return [...(this.mediaAttachments.get(`${targetType}:${targetId}`) ?? [])];
  }
}
