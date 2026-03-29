import { randomUUID } from "node:crypto";
import { ValidationError } from "../../plans/errors.js";
import { normalizePhone, normalizeUrl } from "../../places/normalization.js";
const CONTACT_PRIORITY = ["phone", "email", "website", "booking_url", "contact_url", "social"];
export class BusinessTrustService {
    store;
    now;
    constructor(store, now = () => new Date()) {
        this.store = store;
        this.now = now;
    }
    async recompute(placeId) {
        const nowIso = this.now().toISOString();
        const ownership = await this.store.listOwnershipByPlace(placeId);
        const contacts = await this.store.listBusinessContactMethods(placeId);
        const description = await this.store.getOfficialDescription(placeId);
        const hours = await this.store.getManagedHours(placeId);
        const links = await this.store.listBusinessLinks(placeId);
        const images = await this.store.listBusinessImages(placeId);
        const categories = await this.store.listCategorySuggestions(placeId);
        const activeOwnership = ownership.find((entry) => entry.isActive);
        const claimedStatus = this.resolveClaimedStatus(ownership);
        const checks = {
            hasName: true,
            hasCategory: categories.some((entry) => entry.status === "approved" || entry.status === "pending"),
            hasAddress: true,
            hasHours: Boolean(hours?.weeklyHours && Object.keys(hours.weeklyHours).length > 0),
            hasDescription: Boolean(description?.content?.trim()),
            hasWebsite: links.some((entry) => entry.linkType === "website" && entry.isActive),
            hasPhone: contacts.some((entry) => entry.type === "phone"),
            hasEmail: contacts.some((entry) => entry.type === "email"),
            hasPhotos: images.filter((entry) => entry.isActive && entry.moderationStatus !== "rejected").length >= 3,
            ownerClaimed: claimedStatus === "claimed"
        };
        const weightedChecks = [
            ["has_name", checks.hasName, 8],
            ["has_category", checks.hasCategory, 10],
            ["has_address", checks.hasAddress, 8],
            ["has_hours", checks.hasHours, 12],
            ["has_description", checks.hasDescription, 10],
            ["has_website", checks.hasWebsite, 8],
            ["has_phone", checks.hasPhone, 8],
            ["has_email", checks.hasEmail, 6],
            ["has_gallery_quality", checks.hasPhotos, 10],
            ["owner_claimed", checks.ownerClaimed, 20]
        ];
        const totalWeight = weightedChecks.reduce((sum, [, , weight]) => sum + weight, 0);
        const scoredWeight = weightedChecks.reduce((sum, [, passed, weight]) => sum + (passed ? weight : 0), 0);
        const completenessScore = Math.round((scoredWeight / totalWeight) * 100);
        const completenessTier = this.resolveCompletenessTier(completenessScore);
        const passedChecks = weightedChecks.filter(([, passed]) => passed).map(([key]) => key);
        const missingFields = weightedChecks.filter(([, passed]) => !passed).map(([key]) => key);
        const warnings = [];
        if (!contacts.some((entry) => entry.verificationStatus === "verified"))
            warnings.push("no_verified_contact");
        if (claimedStatus !== "claimed")
            warnings.push("not_claimed");
        const trustTier = claimedStatus === "claimed" && contacts.some((entry) => entry.verificationStatus === "verified") && completenessTier !== "low"
            ? "trusted"
            : completenessTier === "low" ? "none" : "developing";
        const existing = await this.store.getBusinessTrustProfile(placeId);
        const profile = {
            id: existing?.id ?? randomUUID(),
            placeId,
            businessProfileId: activeOwnership?.businessProfileId,
            claimedStatus,
            completenessScore,
            completenessTier,
            trustTier,
            trustFlags: [claimedStatus, `tier:${trustTier}`],
            passedChecks,
            missingFields,
            warnings,
            recomputedAt: nowIso,
            createdAt: existing?.createdAt ?? nowIso,
            updatedAt: nowIso
        };
        await this.store.upsertBusinessTrustProfile(profile);
        await this.appendAuditEvent({
            placeId,
            businessProfileId: profile.businessProfileId,
            actorType: "system",
            eventType: "business_trust_recomputed",
            payload: { completenessScore, completenessTier, claimedStatus, trustTier }
        });
        return profile;
    }
    async upsertContactMethod(placeId, input, actor) {
        const nowIso = this.now().toISOString();
        const normalizedValue = this.normalizeContactValue(input.type, input.value);
        const existing = (await this.store.listBusinessContactMethods(placeId)).find((entry) => entry.type === input.type && entry.normalizedValue === normalizedValue);
        const record = {
            id: existing?.id ?? randomUUID(),
            placeId,
            businessProfileId: actor?.businessProfileId,
            type: input.type,
            value: input.value,
            normalizedValue,
            isPrimary: Boolean(input.isPrimary),
            verificationStatus: existing ? (existing.normalizedValue === normalizedValue ? existing.verificationStatus : "unverified") : "unverified",
            verificationMethod: existing?.verificationMethod ?? "unsupported",
            verifiedAt: existing?.normalizedValue === normalizedValue ? existing.verifiedAt : undefined,
            verifiedByActorId: existing?.normalizedValue === normalizedValue ? existing.verifiedByActorId : undefined,
            lastVerificationAttemptAt: existing?.lastVerificationAttemptAt,
            revokedAt: existing?.normalizedValue === normalizedValue ? existing.revokedAt : nowIso,
            failureReasonCode: existing?.normalizedValue === normalizedValue ? existing.failureReasonCode : "value_changed",
            metadata: existing?.metadata ?? {},
            createdAt: existing?.createdAt ?? nowIso,
            updatedAt: nowIso
        };
        await this.store.upsertBusinessContactMethod(record);
        await this.appendAuditEvent({
            placeId,
            actorType: actor?.isAdmin ? "admin" : actor?.userId ? "user" : "system",
            actorId: actor?.userId,
            eventType: "business_contact_added",
            payload: { contactMethodId: record.id, type: record.type }
        });
        await this.recompute(placeId);
        return record;
    }
    async setContactVerificationStatus(input) {
        const contact = await this.store.getBusinessContactMethodById(input.contactMethodId);
        if (!contact || contact.placeId !== input.placeId)
            throw new ValidationError(["contact method not found"]);
        const nowIso = this.now().toISOString();
        const next = {
            ...contact,
            verificationStatus: input.status,
            verificationMethod: input.method ?? contact.verificationMethod,
            lastVerificationAttemptAt: nowIso,
            verifiedAt: input.status === "verified" ? nowIso : contact.verifiedAt,
            verifiedByActorId: input.status === "verified" ? input.actor?.userId : contact.verifiedByActorId,
            revokedAt: input.status === "revoked" ? nowIso : contact.revokedAt,
            failureReasonCode: input.reasonCode,
            updatedAt: nowIso
        };
        await this.store.upsertBusinessContactMethod(next);
        const eventType = input.status === "verified"
            ? "business_contact_verified"
            : input.status === "failed"
                ? "business_contact_verification_failed"
                : input.status === "revoked"
                    ? "business_contact_verification_revoked"
                    : "business_contact_verification_started";
        await this.appendAuditEvent({
            placeId: input.placeId,
            actorType: input.actor?.isAdmin ? "admin" : input.actor?.userId ? "user" : "system",
            actorId: input.actor?.userId,
            eventType,
            payload: { contactMethodId: input.contactMethodId, status: input.status, reasonCode: input.reasonCode }
        });
        await this.recompute(input.placeId);
        return next;
    }
    async buildPublicTrustView(placeId) {
        const trust = await this.recompute(placeId);
        const contacts = await this.store.listBusinessContactMethods(placeId);
        const verifiedContactTypes = CONTACT_PRIORITY.filter((type) => contacts.some((entry) => entry.type === type && entry.verificationStatus === "verified"));
        const badges = this.buildBadges(trust, verifiedContactTypes);
        return {
            claimedStatus: trust.claimedStatus,
            isClaimed: trust.claimedStatus === "claimed",
            verifiedContactTypes,
            profileCompletenessTier: trust.completenessTier,
            profileCompletenessLabel: trust.completenessTier === "strong" ? "Complete profile" : trust.completenessTier === "good" ? "Well maintained" : trust.completenessTier === "partial" ? "Partially complete" : "Basic profile",
            trustTier: trust.trustTier,
            trustSummary: badges.map((entry) => entry.label).join(" · ") || "No trust indicators yet",
            badges
        };
    }
    buildBadges(trust, verifiedContactTypes) {
        const badges = [];
        if (trust.claimedStatus === "claimed") {
            badges.push({
                key: "claimed",
                label: "Claimed",
                description: "This business profile has been claimed by the business owner on Dryad.",
                priority: 1
            });
        }
        if (verifiedContactTypes.length > 0) {
            badges.push({
                key: "verified_contact",
                label: "Verified Contact",
                description: "Dryad verified at least one contact method for this business.",
                priority: 2
            });
        }
        if (trust.completenessTier === "good" || trust.completenessTier === "strong") {
            badges.push({
                key: "complete_profile",
                label: "Complete Profile",
                description: "This business profile includes key information like hours, contact details, and business info.",
                priority: 3
            });
        }
        if (trust.claimedStatus === "claimed" && verifiedContactTypes.length > 0 && trust.completenessTier === "strong") {
            badges.push({
                key: "trusted_business",
                label: "Trusted Business",
                description: "This business meets Dryad standards for claim status, verified contact, and profile completeness.",
                priority: 4
            });
        }
        return badges.sort((a, b) => a.priority - b.priority).slice(0, 3);
    }
    resolveClaimedStatus(ownership) {
        if (ownership.some((entry) => entry.isActive && entry.verificationStatus === "verified"))
            return "claimed";
        if (ownership.some((entry) => entry.verificationStatus === "pending"))
            return "claimed_pending";
        if (ownership.some((entry) => entry.verificationStatus === "revoked")) {
            if (ownership.some((entry) => entry.revokedReasonCode === "ownership_dispute"))
                return "claim_disputed";
            return "claim_revoked";
        }
        return "unclaimed";
    }
    resolveCompletenessTier(score) {
        if (score >= 85)
            return "strong";
        if (score >= 65)
            return "good";
        if (score >= 40)
            return "partial";
        return "low";
    }
    normalizeContactValue(type, value) {
        if (type === "phone") {
            const normalized = normalizePhone(value);
            if (!normalized)
                throw new ValidationError(["phone contact must be valid"]);
            return normalized;
        }
        if (type === "email") {
            const normalized = value.trim().toLowerCase();
            if (!/^[-a-z0-9._+]+@[-a-z0-9.]+\.[a-z]{2,}$/i.test(normalized))
                throw new ValidationError(["email contact must be valid"]);
            return normalized;
        }
        const normalizedUrl = normalizeUrl(value);
        if (!normalizedUrl)
            throw new ValidationError([`${type} contact must be a valid http/https url`]);
        return normalizedUrl;
    }
    async appendAuditEvent(input) {
        await this.store.appendBusinessTrustAuditEvent({
            id: randomUUID(),
            createdAt: this.now().toISOString(),
            ...input
        });
    }
}
