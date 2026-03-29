import { PLAN_CATALOG, getPlan } from "../subscriptions/catalog.js";
import { ENTITLEMENT_DEFINITIONS } from "../subscriptions/entitlementDefinitions.js";
export class StorageFoundationService {
    roleAssignments = new Map();
    placeSourceLinks = new Map();
    entitlementGrants = new Map();
    claims = new Map();
    mediaAttachments = new Map();
    getPlanByCode(code) {
        return PLAN_CATALOG.find((plan) => plan.code === code);
    }
    isKnownEntitlementKey(key) {
        return ENTITLEMENT_DEFINITIONS.some((item) => item.key === key);
    }
    assignRole(input) {
        const next = { ...input, grantedAt: input.grantedAt ?? new Date().toISOString() };
        const list = this.roleAssignments.get(input.userId) ?? [];
        const existing = list.find((item) => item.roleKey === input.roleKey && item.status === "ACTIVE");
        if (existing && next.status === "ACTIVE")
            return existing;
        list.push(next);
        this.roleAssignments.set(input.userId, list);
        return next;
    }
    hasRole(userId, roleKey) {
        return (this.roleAssignments.get(userId) ?? []).some((item) => item.roleKey === roleKey && item.status === "ACTIVE");
    }
    linkPlaceSource(link) {
        const key = `${link.provider}:${link.providerPlaceId}`;
        const prior = this.placeSourceLinks.get(key);
        if (prior && prior.placeId !== link.placeId) {
            throw new Error("Provider source is already linked to a different place");
        }
        this.placeSourceLinks.set(key, link);
        return link;
    }
    grantEntitlement(grant) {
        const key = `${grant.principalType}:${grant.principalId}`;
        const list = this.entitlementGrants.get(key) ?? [];
        list.push(grant);
        this.entitlementGrants.set(key, list);
        return grant;
    }
    resolveEntitlement(input) {
        const at = input.at ? new Date(input.at) : new Date();
        const scoped = (this.entitlementGrants.get(`${input.principalType}:${input.principalId}`) ?? [])
            .filter((grant) => grant.key === input.key)
            .filter((grant) => (grant.status === "ACTIVE" || grant.status === "SCHEDULED"))
            .filter((grant) => new Date(grant.effectiveFrom) <= at)
            .filter((grant) => !grant.effectiveTo || new Date(grant.effectiveTo) >= at)
            .sort((a, b) => a.sourceType === "MANUAL" ? -1 : b.sourceType === "MANUAL" ? 1 : 0);
        if (scoped[0])
            return scoped[0].value;
        if (input.planCode) {
            const plan = this.getPlanByCode(input.planCode) ?? getPlan(input.planCode);
            return plan?.entitlements[input.key];
        }
        return undefined;
    }
    createClaim(claim) {
        for (const row of this.claims.values()) {
            if (row.placeId === claim.placeId && row.businessProfileId === claim.businessProfileId && ["PENDING", "UNDER_REVIEW"].includes(row.status)) {
                throw new Error("An active claim already exists for this business/place pair");
            }
        }
        this.claims.set(claim.id, claim);
        return claim;
    }
    transitionClaim(claimId, nextStatus) {
        const current = this.claims.get(claimId);
        if (!current)
            throw new Error("Claim not found");
        const updated = { ...current, status: nextStatus, reviewedAt: new Date().toISOString() };
        this.claims.set(claimId, updated);
        return updated;
    }
    attachMedia(input) {
        const key = `${input.targetType}:${input.targetId}`;
        const list = this.mediaAttachments.get(key) ?? [];
        if (list.some((row) => row.mediaAssetId === input.mediaAssetId))
            return input;
        list.push(input);
        list.sort((a, b) => a.displayOrder - b.displayOrder);
        this.mediaAttachments.set(key, list);
        return input;
    }
    listMediaForTarget(targetType, targetId) {
        return [...(this.mediaAttachments.get(`${targetType}:${targetId}`) ?? [])];
    }
}
