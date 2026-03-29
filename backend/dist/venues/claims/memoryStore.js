import { RetentionPolicy } from "../../retention/policy.js";
import { ValidationError } from "../../plans/errors.js";
function encodeOffsetCursor(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64");
}
function decodeOffsetCursor(cursor) {
    if (!cursor)
        return 0;
    const parsed = Number.parseInt(Buffer.from(cursor, "base64").toString("utf8"), 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error("invalid cursor");
    }
    return parsed;
}
const REVIEW_QUEUE_STATUSES = ["submitted", "pending_verification", "under_review", "needs_more_info"];
export class MemoryVenueClaimStore {
    claims = new Map();
    evidence = new Map();
    ownership = new Map();
    content = new Map();
    auditEvents = [];
    managedProfiles = new Map();
    officialDescriptions = new Map();
    categorySuggestions = new Map();
    managedHours = new Map();
    businessLinks = new Map();
    menuServiceCatalogs = new Map();
    businessImages = new Map();
    businessManagedAuditEvents = [];
    businessContactMethods = new Map();
    businessTrustProfiles = new Map();
    businessTrustAuditEvents = [];
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new RetentionPolicy();
    }
    async createClaim(input) { this.claims.set(input.id, input); }
    async listClaims(opts) {
        let offset = 0;
        try {
            offset = decodeOffsetCursor(opts?.cursor);
        }
        catch {
            throw new ValidationError(["cursor must be a valid base64 offset"]);
        }
        const limit = Math.min(opts?.limit ?? 50, 200);
        const filtered = [...this.claims.values()]
            .filter((claim) => {
            if (opts?.placeId && claim.placeId !== opts.placeId)
                return false;
            if (opts?.claimantUserId && claim.claimantUserId !== opts.claimantUserId)
                return false;
            if (opts?.status && claim.status !== opts.status)
                return false;
            if (opts?.reviewQueueOnly && !REVIEW_QUEUE_STATUSES.includes(claim.status))
                return false;
            return true;
        })
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const claims = filtered.slice(offset, offset + limit);
        const nextOffset = offset + claims.length;
        return { claims, nextCursor: nextOffset < filtered.length ? encodeOffsetCursor(nextOffset) : null };
    }
    async getClaimById(claimId) { return this.claims.get(claimId) ?? null; }
    async updateClaim(claimId, patch) {
        const existing = this.claims.get(claimId);
        if (!existing)
            return null;
        const next = { ...existing, ...patch };
        this.claims.set(claimId, next);
        return next;
    }
    async findClaimByPlaceAndUser(placeId, userId, statuses) {
        for (const claim of this.claims.values()) {
            if (claim.placeId === placeId && claim.claimantUserId === userId) {
                if (!statuses || statuses.includes(claim.status))
                    return claim;
            }
        }
        return null;
    }
    async addEvidence(input) { this.evidence.set(input.id, input); }
    async listEvidence(claimId) { return [...this.evidence.values()].filter((e) => e.claimId === claimId); }
    async getEvidenceById(evidenceId) { return this.evidence.get(evidenceId) ?? null; }
    async updateEvidence(evidenceId, patch) {
        const existing = this.evidence.get(evidenceId);
        if (!existing)
            return null;
        const next = { ...existing, ...patch };
        this.evidence.set(evidenceId, next);
        return next;
    }
    async upsertOwnership(input) { this.ownership.set(input.id, input); }
    async listOwnershipByPlace(placeId) { return [...this.ownership.values()].filter((o) => o.placeId === placeId); }
    async getOwnershipById(ownershipId) { return this.ownership.get(ownershipId) ?? null; }
    async updateOwnership(ownershipId, patch) {
        const existing = this.ownership.get(ownershipId);
        if (!existing)
            return null;
        const next = { ...existing, ...patch };
        this.ownership.set(ownershipId, next);
        return next;
    }
    async upsertBusinessContent(input) { this.content.set(input.id, input); }
    async listBusinessContent(placeId) { return [...this.content.values()].filter((c) => c.placeId === placeId); }
    async appendAuditEvent(input) { this.auditEvents.push(input); }
    async listAuditEvents(placeId) { return this.auditEvents.filter((a) => a.placeId === placeId); }
    async upsertBusinessManagedPlaceProfile(input) {
        this.managedProfiles.set(input.placeId, input);
    }
    async getBusinessManagedPlaceProfile(placeId) {
        return this.managedProfiles.get(placeId) ?? null;
    }
    async upsertOfficialDescription(input) {
        this.officialDescriptions.set(input.placeId, input);
    }
    async getOfficialDescription(placeId) {
        return this.officialDescriptions.get(placeId) ?? null;
    }
    async upsertCategorySuggestion(input) {
        this.categorySuggestions.set(input.id, input);
    }
    async listCategorySuggestions(placeId) {
        return [...this.categorySuggestions.values()].filter((entry) => entry.placeId === placeId);
    }
    async upsertManagedHours(input) {
        this.managedHours.set(input.placeId, input);
    }
    async getManagedHours(placeId) {
        return this.managedHours.get(placeId) ?? null;
    }
    async upsertBusinessLink(input) {
        this.businessLinks.set(input.id, input);
    }
    async listBusinessLinks(placeId) {
        return [...this.businessLinks.values()]
            .filter((entry) => entry.placeId === placeId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    async upsertMenuServiceCatalog(input) {
        this.menuServiceCatalogs.set(input.id, input);
    }
    async listMenuServiceCatalogs(placeId) {
        return [...this.menuServiceCatalogs.values()].filter((entry) => entry.placeId === placeId);
    }
    async upsertBusinessImage(input) {
        this.businessImages.set(input.id, input);
    }
    async listBusinessImages(placeId) {
        return [...this.businessImages.values()]
            .filter((entry) => entry.placeId === placeId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }
    async upsertBusinessContactMethod(input) {
        this.businessContactMethods.set(input.id, input);
    }
    async listBusinessContactMethods(placeId) {
        return [...this.businessContactMethods.values()].filter((entry) => entry.placeId === placeId);
    }
    async getBusinessContactMethodById(contactMethodId) {
        return this.businessContactMethods.get(contactMethodId) ?? null;
    }
    async upsertBusinessTrustProfile(input) {
        this.businessTrustProfiles.set(input.placeId, input);
    }
    async getBusinessTrustProfile(placeId) {
        return this.businessTrustProfiles.get(placeId) ?? null;
    }
    async appendBusinessTrustAuditEvent(input) {
        this.businessTrustAuditEvents.push(input);
    }
    async listBusinessTrustAuditEvents(placeId) {
        return this.businessTrustAuditEvents.filter((entry) => entry.placeId === placeId);
    }
    async appendBusinessManagedAuditEvent(input) {
        this.businessManagedAuditEvents.push(input);
    }
    async listBusinessManagedAuditEvents(placeId) {
        return this.businessManagedAuditEvents.filter((entry) => entry.placeId === placeId);
    }
    // legacy compatibility
    async create(input) {
        const statusMap = { pending: "submitted", verified: "approved", rejected: "rejected" };
        const record = {
            id: input.claimId,
            placeId: input.venueId,
            claimantUserId: "legacy-user",
            claimType: "sole_owner",
            requestedRole: "owner",
            status: statusMap[input.verificationStatus],
            verificationLevel: "none",
            verificationMethodSelection: [],
            contactEmail: input.contactEmail,
            createdAt: input.createdAtISO,
            updatedAt: input.createdAtISO,
            submittedAt: input.createdAtISO
        };
        await this.createClaim(record);
    }
    async list() {
        const claims = [...this.claims.values()]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((claim) => ({
            claimId: claim.id,
            venueId: claim.placeId,
            contactEmail: claim.contactEmail,
            verificationStatus: (claim.status === "approved" ? "verified" : claim.status === "rejected" ? "rejected" : "pending"),
            createdAtISO: claim.createdAt,
            updatedAtISO: claim.updatedAt
        }));
        return { claims };
    }
    prune(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.venue_claims, now = new Date()) {
        const thresholdMs = now.getTime() - maxAgeMs;
        let removed = 0;
        for (const [id, claim] of this.claims.entries()) {
            const createdAtMs = Date.parse(claim.createdAt);
            if (!Number.isFinite(createdAtMs) || createdAtMs < thresholdMs) {
                this.claims.delete(id);
                removed += 1;
            }
        }
        return removed;
    }
}
