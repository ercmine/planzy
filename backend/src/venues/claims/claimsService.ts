import { randomUUID } from "node:crypto";

import { ValidationError } from "../../plans/errors.js";
import { normalizePhone, normalizeUrl } from "../../places/normalization.js";
import { sanitizeText } from "../../sanitize/text.js";
import { BusinessTrustService } from "./trustService.js";
import type {
  BusinessManagedHours,
  BusinessManagedPlaceContentRecord,
  BusinessManagedPlaceImage,
  BusinessPlaceCategorySuggestion,
  BusinessPlaceClaimRecord,
  BusinessPlaceLink,
  BusinessPlaceLinkType,
  BusinessTrustPublicView,
  ContactVerificationMethod,
  ContactVerificationStatus,
  BusinessPlaceMenuServiceCatalog,
  ClaimActor,
  ClaimStatus,
  ListClaimsResult,
  OfficialBusinessDescription,
  OwnershipRole,
  PlaceBusinessOwnershipRecord,
  VerificationLevel
} from "./types.js";
import type { VenueClaimStore } from "./store.js";
import { validateBusinessClaimInput, validateEvidenceInput, validateListClaimsOptions } from "./validation.js";

const TERMINAL: ClaimStatus[] = ["approved", "rejected", "withdrawn", "expired", "revoked", "suspended"];
const URL_LINK_TYPES = new Set<BusinessPlaceLinkType>([
  "website",
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "reservation",
  "booking",
  "order",
  "waitlist",
  "menu",
  "services",
  "tickets",
  "contact_form"
]);

export class VenueClaimsService {
  private readonly trustService: BusinessTrustService;

  constructor(private readonly store: VenueClaimStore, private readonly now: () => Date = () => new Date()) {
    this.trustService = new BusinessTrustService(store, now);
  }

  private requireUser(actor?: ClaimActor): string {
    if (!actor?.userId) throw new ValidationError(["x-user-id is required"]);
    return actor.userId;
  }

  private assertCanReview(actor?: ClaimActor): void {
    if (!actor?.isAdmin) throw new ValidationError(["admin privileges required"]);
  }

  public async getActiveOwnershipForBusinessActor(input: { placeId: string; businessProfileId: string; userId: string }): Promise<PlaceBusinessOwnershipRecord> {
    const ownership = (await this.store.listOwnershipByPlace(input.placeId)).find((entry) => (
      entry.isActive
      && entry.verificationStatus === "verified"
      && entry.businessProfileId === input.businessProfileId
    ));
    if (!ownership) throw new ValidationError(["active verified business claim required for this place"]);
    return ownership;
  }

  private async assertCanManageClaimedPlace(placeId: string, actor?: ClaimActor) {
    const userId = this.requireUser(actor);
    const ownership = (await this.store.listOwnershipByPlace(placeId)).find((entry) => entry.isActive && entry.primaryUserId === userId);
    if (!ownership && !actor?.isAdmin) throw new ValidationError(["user cannot manage this place"]);
    return ownership;
  }

  public async createClaimDraft(input: unknown, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const userId = this.requireUser(actor);
    const validated = validateBusinessClaimInput(input);
    const dupe = await this.store.findClaimByPlaceAndUser(validated.placeId, userId, ["draft", "submitted", "pending_verification", "under_review", "needs_more_info"]);
    if (dupe) return dupe;

    const nowIso = this.now().toISOString();
    const record: BusinessPlaceClaimRecord = {
      id: randomUUID(),
      placeId: validated.placeId,
      claimantUserId: userId,
      claimType: validated.claimType,
      requestedRole: validated.requestedRole,
      status: "draft",
      verificationLevel: "none",
      verificationMethodSelection: validated.verificationMethodSelection ?? [],
      contactEmail: validated.contactEmail,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(validated.claimantBusinessProfileId ? { claimantBusinessProfileId: validated.claimantBusinessProfileId } : {}),
      ...(validated.contactPhone ? { contactPhone: validated.contactPhone } : {}),
      ...(validated.message ? { message: validated.message } : {})
    };
    await this.store.createClaim(record);
    await this.track(record.placeId, "business_claim_started", actor?.userId, { claimId: record.id, claimType: record.claimType });
    return record;
  }

  public async submitClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const userId = this.requireUser(actor);
    const claim = await this.store.getClaimById(claimId);
    if (!claim || claim.claimantUserId !== userId) throw new ValidationError(["claim not found"]);
    if (TERMINAL.includes(claim.status)) throw new ValidationError(["claim can no longer be submitted"]);
    const updated = await this.store.updateClaim(claimId, { status: "submitted", submittedAt: this.now().toISOString(), updatedAt: this.now().toISOString() });
    await this.track(claim.placeId, "business_claim_submitted", userId, { claimId });
    return updated ?? claim;
  }

  public async listLeads(opts?: unknown, actor?: ClaimActor): Promise<ListClaimsResult> {
    const normalized = validateListClaimsOptions(opts);
    if (!actor?.isAdmin) {
      const userId = this.requireUser(actor);
      normalized.claimantUserId = userId;
      normalized.reviewQueueOnly = false;
    }
    return this.store.listClaims(normalized);
  }

  public async getClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord> {
    const claim = await this.store.getClaimById(claimId);
    if (!claim) throw new ValidationError(["claim not found"]);
    if (!actor?.isAdmin && actor?.userId !== claim.claimantUserId) throw new ValidationError(["not authorized to view claim"]);
    return claim;
  }

  public async addEvidence(claimId: string, input: unknown, actor?: ClaimActor) {
    const userId = this.requireUser(actor);
    const claim = await this.getClaim(claimId, actor);
    if (claim.claimantUserId !== userId) throw new ValidationError(["only claimant can add evidence"]);
    const validated = validateEvidenceInput(input);
    const nowIso = this.now().toISOString();
    const evidence = {
      id: randomUUID(),
      claimId,
      evidenceType: validated.evidenceType,
      status: "submitted" as const,
      metadata: validated.metadata ?? {},
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(validated.normalizedValue ? { normalizedValue: validated.normalizedValue } : {}),
      ...(validated.storageRef ? { storageRef: validated.storageRef } : {}),
      ...(validated.notes ? { notes: validated.notes } : {})
    };
    await this.store.addEvidence(evidence);
    await this.store.updateClaim(claimId, { status: "pending_verification", updatedAt: nowIso });
    await this.track(claim.placeId, "business_claim_evidence_uploaded", userId, { claimId, evidenceType: evidence.evidenceType });
    return evidence;
  }

  public async listEvidence(claimId: string, actor?: ClaimActor) {
    await this.getClaim(claimId, actor);
    return this.store.listEvidence(claimId);
  }

  public async reviewClaim(claimId: string, decision: "approve" | "reject" | "request_more_info", reasonCode: string, notes: string | undefined, actor?: ClaimActor) {
    this.assertCanReview(actor);
    const claim = await this.store.getClaimById(claimId);
    if (!claim) throw new ValidationError(["claim not found"]);
    const nowIso = this.now().toISOString();

    if (decision === "request_more_info") {
      const updated = await this.store.updateClaim(claimId, { status: "needs_more_info", statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });
      await this.track(claim.placeId, "business_claim_requested_more_info", actor?.userId, { claimId, reasonCode, notes });
      return updated;
    }

    if (decision === "reject") {
      const updated = await this.store.updateClaim(claimId, { status: "rejected", statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });
      await this.track(claim.placeId, "business_claim_rejected", actor?.userId, { claimId, reasonCode, notes });
      return updated;
    }

    const existingPrimary = (await this.store.listOwnershipByPlace(claim.placeId)).find((o) => o.isPrimary && o.isActive);
    const status: ClaimStatus = existingPrimary ? "partially_approved" : "approved";
    const level = this.inferVerificationLevel(await this.store.listEvidence(claimId));
    const updated = await this.store.updateClaim(claimId, { status, verificationLevel: level, statusReasonCode: reasonCode, reviewedAt: nowIso, reviewerUserId: actor?.userId, updatedAt: nowIso });

    const ownership: PlaceBusinessOwnershipRecord = {
      id: randomUUID(),
      placeId: claim.placeId,
      ownershipRole: claim.requestedRole,
      verificationStatus: "verified",
      verificationLevel: level,
      verificationMethodSummary: claim.verificationMethodSelection,
      isPrimary: !existingPrimary,
      isActive: true,
      approvedClaimId: claim.id,
      approvedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(claim.claimantBusinessProfileId ? { businessProfileId: claim.claimantBusinessProfileId } : {}),
      ...(claim.claimantUserId ? { primaryUserId: claim.claimantUserId } : {})
    };
    await this.store.upsertOwnership(ownership);
    await this.trustService.recompute(claim.placeId);
    await this.track(claim.placeId, "business_claim_approved", actor?.userId, { claimId, reasonCode, ownershipId: ownership.id, partial: Boolean(existingPrimary) });
    return updated;
  }

  public async revokeOwnership(ownershipId: string, reasonCode: string, actor?: ClaimActor): Promise<void> {
    this.assertCanReview(actor);
    const own = await this.store.getOwnershipById(ownershipId);
    if (!own) throw new ValidationError(["ownership not found"]);
    const nowIso = this.now().toISOString();
    await this.store.updateOwnership(ownershipId, { isActive: false, verificationStatus: "revoked", revokedAt: nowIso, revokedReasonCode: reasonCode, updatedAt: nowIso });
    await this.trustService.recompute(own.placeId);
    await this.track(own.placeId, "business_ownership_revoked", actor?.userId, { ownershipId, reasonCode });
  }

  public async updateOfficialDescription(placeId: string, content: unknown, actor?: ClaimActor): Promise<OfficialBusinessDescription> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    const safe = sanitizeText(content, { source: "user", maxLen: 2400, allowNewlines: true, profanityMode: "mask" });
    if (!safe) throw new ValidationError(["description content is required"]);
    const nowIso = this.now().toISOString();
    const record: OfficialBusinessDescription = {
      id: randomUUID(),
      placeId,
      content: safe,
      moderationStatus: "approved",
      visibilityStatus: "published",
      authoredByUserId: this.requireUser(actor),
      createdAt: nowIso,
      updatedAt: nowIso,
      publishedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertOfficialDescription(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "description", entityId: record.id, action: "updated", actorUserId: actor?.userId, metadata: { moderationStatus: record.moderationStatus }, createdAt: nowIso });
    await this.store.upsertBusinessManagedPlaceProfile({ id: randomUUID(), placeId, ownershipLinkId: ownership?.id ?? "admin", status: "active", createdAt: nowIso, updatedAt: nowIso, publishedAt: nowIso, ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {}) });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async submitCategorySuggestion(placeId: string, input: { primaryCategoryId?: string; secondaryCategoryIds?: string[]; reason?: string }, actor?: ClaimActor): Promise<BusinessPlaceCategorySuggestion> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    if (!input.primaryCategoryId && (!input.secondaryCategoryIds || input.secondaryCategoryIds.length === 0)) throw new ValidationError(["at least one category suggestion is required"]);
    const nowIso = this.now().toISOString();
    const record: BusinessPlaceCategorySuggestion = {
      id: randomUUID(),
      placeId,
      suggestedPrimaryCategoryId: input.primaryCategoryId,
      suggestedSecondaryCategoryIds: (input.secondaryCategoryIds ?? []).slice(0, 12),
      reason: sanitizeText(input.reason, { source: "user", maxLen: 280, allowNewlines: false, profanityMode: "mask" }),
      status: "pending",
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertCategorySuggestion(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "category", entityId: record.id, action: "created", actorUserId: actor?.userId, metadata: { primary: input.primaryCategoryId }, createdAt: nowIso });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async updateManagedHours(placeId: string, input: Omit<BusinessManagedHours, "id" | "placeId" | "createdAt" | "updatedAt" | "businessProfileId">, actor?: ClaimActor): Promise<BusinessManagedHours> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    if (!input.timezone || typeof input.timezone !== "string") throw new ValidationError(["timezone is required"]);
    const nowIso = this.now().toISOString();
    const record: BusinessManagedHours = {
      id: randomUUID(),
      placeId,
      timezone: input.timezone,
      weeklyHours: input.weeklyHours,
      specialHours: input.specialHours,
      temporaryClosureStatus: input.temporaryClosureStatus,
      moderationStatus: "approved",
      effectiveStatus: "active",
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertManagedHours(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "hours", entityId: record.id, action: "updated", actorUserId: actor?.userId, metadata: { timezone: record.timezone }, createdAt: nowIso });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async upsertBusinessLink(placeId: string, input: { linkType: BusinessPlaceLinkType; value: string; label?: string; sortOrder?: number }, actor?: ClaimActor): Promise<BusinessPlaceLink> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    const nowIso = this.now().toISOString();
    const normalized = this.normalizeLinkByType(input.linkType, input.value);
    const record: BusinessPlaceLink = {
      id: randomUUID(),
      placeId,
      linkType: input.linkType,
      url: normalized,
      label: sanitizeText(input.label, { source: "user", maxLen: 40, allowNewlines: false, profanityMode: "mask" }),
      sortOrder: input.sortOrder ?? 0,
      moderationStatus: input.linkType === "website" || input.linkType === "menu" || input.linkType === "services" ? "approved" : "pending",
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertBusinessLink(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "link", entityId: record.id, action: "updated", actorUserId: actor?.userId, metadata: { linkType: record.linkType }, createdAt: nowIso });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async upsertMenuServices(placeId: string, input: { contentType: "menu" | "services"; externalUrl?: string; structuredData?: Record<string, unknown> }, actor?: ClaimActor): Promise<BusinessPlaceMenuServiceCatalog> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    const nowIso = this.now().toISOString();
    const externalUrl = input.externalUrl ? normalizeUrl(input.externalUrl) : undefined;
    if (input.externalUrl && !externalUrl) throw new ValidationError(["externalUrl must be a valid http/https url"]);
    const record: BusinessPlaceMenuServiceCatalog = {
      id: randomUUID(),
      placeId,
      contentType: input.contentType,
      externalUrl,
      structuredData: input.structuredData ?? {},
      moderationStatus: "approved",
      visibility: "published",
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertMenuServiceCatalog(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "menu_services", entityId: record.id, action: "updated", actorUserId: actor?.userId, metadata: { contentType: record.contentType }, createdAt: nowIso });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async upsertBusinessImage(placeId: string, input: Omit<BusinessManagedPlaceImage, "id" | "placeId" | "createdAt" | "updatedAt" | "businessProfileId" | "moderationStatus">, actor?: ClaimActor): Promise<BusinessManagedPlaceImage> {
    const ownership = await this.assertCanManageClaimedPlace(placeId, actor);
    const nowIso = this.now().toISOString();
    const record: BusinessManagedPlaceImage = {
      id: randomUUID(),
      placeId,
      mediaAssetId: input.mediaAssetId,
      imageType: input.imageType,
      caption: sanitizeText(input.caption, { source: "user", maxLen: 140, allowNewlines: false, profanityMode: "mask" }),
      altText: sanitizeText(input.altText, { source: "user", maxLen: 140, allowNewlines: false, profanityMode: "mask" }),
      sortOrder: input.sortOrder,
      moderationStatus: "pending",
      isCover: input.isCover,
      isActive: input.isActive,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership?.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertBusinessImage(record);
    await this.store.appendBusinessManagedAuditEvent({ id: randomUUID(), placeId, entityType: "gallery", entityId: record.id, action: "created", actorUserId: actor?.userId, metadata: { imageType: record.imageType, isCover: record.isCover }, createdAt: nowIso });
    await this.trustService.recompute(placeId);
    return record;
  }

  public async upsertOfficialContent(placeId: string, ownershipId: string, contentType: BusinessManagedPlaceContentRecord["contentType"], value: Record<string, unknown>, actor?: ClaimActor) {
    const userId = this.requireUser(actor);
    const ownership = await this.store.getOwnershipById(ownershipId);
    if (!ownership || !ownership.isActive || ownership.placeId !== placeId) throw new ValidationError(["ownership not active"]);
    if (!actor?.isAdmin && ownership.primaryUserId !== userId) throw new ValidationError(["user cannot manage this place"]);

    const nowIso = this.now().toISOString();
    const record: BusinessManagedPlaceContentRecord = {
      id: randomUUID(),
      placeId,
      ownershipId,
      contentType,
      value,
      moderationState: "pending",
      sourceType: "official_business",
      visibility: "public",
      createdByUserId: userId,
      createdAt: nowIso,
      updatedAt: nowIso,
      ...(ownership.businessProfileId ? { businessProfileId: ownership.businessProfileId } : {})
    };
    await this.store.upsertBusinessContent(record);
    await this.track(placeId, contentType === "review_reply" ? "official_business_reply_posted" : "official_business_content_updated", userId, { placeId, contentType });
    return record;
  }

  public async getPlaceManagementState(placeId: string, actor?: ClaimActor) {
    const ownership = await this.store.listOwnershipByPlace(placeId);
    const content = await this.store.listBusinessContent(placeId);
    const description = await this.store.getOfficialDescription(placeId);
    const hours = await this.store.getManagedHours(placeId);
    const links = await this.store.listBusinessLinks(placeId);
    const catalogs = await this.store.listMenuServiceCatalogs(placeId);
    const images = await this.store.listBusinessImages(placeId);
    const categories = await this.store.listCategorySuggestions(placeId);
    const canManage = Boolean(actor?.userId && ownership.some((o) => o.isActive && o.primaryUserId === actor.userId));
    return { ownership, content, description, hours, links, catalogs, images, categories, canManage };
  }

  public async buildPublicPlaceProjection(placeId: string, providerData: Record<string, unknown>) {
    const ownership = (await this.store.listOwnershipByPlace(placeId)).find((o) => o.isActive && o.isPrimary);
    const officialDescription = await this.store.getOfficialDescription(placeId);
    const officialHours = await this.store.getManagedHours(placeId);
    const officialLinks = (await this.store.listBusinessLinks(placeId)).filter((entry) => entry.isActive && entry.moderationStatus !== "rejected");
    const officialImages = (await this.store.listBusinessImages(placeId)).filter((entry) => entry.isActive && entry.moderationStatus !== "rejected");
    const menuServices = (await this.store.listMenuServiceCatalogs(placeId)).filter((entry) => entry.visibility === "published" && entry.moderationStatus !== "rejected");
    const categorySuggestions = await this.store.listCategorySuggestions(placeId);
    const approvedCategory = categorySuggestions.find((entry) => entry.status === "approved");

    const trust = await this.trustService.buildPublicTrustView(placeId);

    return {
      provider: providerData,
      merged: {
        description: {
          value: officialDescription?.visibilityStatus === "published" ? officialDescription.content : providerData["longDescription"],
          source: officialDescription?.visibilityStatus === "published" ? "official_business" : "normalized_provider"
        },
        hours: {
          value: officialHours?.effectiveStatus === "active" ? officialHours.weeklyHours : providerData["normalizedHours"],
          source: officialHours?.effectiveStatus === "active" ? "official_business" : "normalized_provider"
        },
        website: {
          value: officialLinks.find((entry) => entry.linkType === "website")?.url ?? providerData["websiteUrl"],
          source: officialLinks.find((entry) => entry.linkType === "website") ? "official_business" : "normalized_provider"
        },
        categories: {
          value: {
            provider: providerData["providerCategories"],
            businessSuggestion: approvedCategory
              ? { primary: approvedCategory.suggestedPrimaryCategoryId, secondary: approvedCategory.suggestedSecondaryCategoryIds }
              : null
          },
          source: approvedCategory ? "business_approved_suggestion" : "normalized_provider"
        },
        images: {
          officialCover: officialImages.find((entry) => entry.isCover)?.mediaAssetId ?? null,
          official: officialImages,
          provider: providerData["photoGallery"]
        },
        links: officialLinks,
        menuServices
      },
      official: {
        isManaged: Boolean(ownership),
        verifiedBadge: ownership?.verificationStatus === "verified",
        verificationLevel: ownership?.verificationLevel,
        attribution: "official_business"
      },
      sourcePrecedence: ["official_business", "business_approved_suggestion", "moderated_override", "normalized_provider", "raw_provider"],
      trust
    };
  }


  public async upsertBusinessContactMethod(placeId: string, input: { type: "phone" | "email" | "website" | "booking_url" | "contact_url" | "social"; value: string; isPrimary?: boolean }, actor?: ClaimActor) {
    await this.assertCanManageClaimedPlace(placeId, actor);
    return this.trustService.upsertContactMethod(placeId, input, actor);
  }

  public async listBusinessContactMethods(placeId: string, actor?: ClaimActor) {
    await this.assertCanManageClaimedPlace(placeId, actor);
    return this.store.listBusinessContactMethods(placeId);
  }

  public async verifyBusinessContactMethod(placeId: string, contactMethodId: string, input: { status: ContactVerificationStatus; method?: ContactVerificationMethod; reasonCode?: string }, actor?: ClaimActor) {
    await this.assertCanManageClaimedPlace(placeId, actor);
    if (!actor?.isAdmin && input.status !== "pending_verification") throw new ValidationError(["admin required for this verification action"]);
    return this.trustService.setContactVerificationStatus({ placeId, contactMethodId, status: input.status, method: input.method, reasonCode: input.reasonCode, actor });
  }

  public async getBusinessTrustStatus(placeId: string, actor?: ClaimActor): Promise<{ publicView: BusinessTrustPublicView; internal: unknown }> {
    await this.assertCanManageClaimedPlace(placeId, actor);
    const publicView = await this.trustService.buildPublicTrustView(placeId);
    const profile = await this.store.getBusinessTrustProfile(placeId);
    const contacts = await this.store.listBusinessContactMethods(placeId);
    return { publicView, internal: { profile, contacts } };
  }

  public async getAdminBusinessTrustState(placeId: string, actor?: ClaimActor) {
    this.assertCanReview(actor);
    const publicView = await this.trustService.buildPublicTrustView(placeId);
    return {
      publicView,
      trustProfile: await this.store.getBusinessTrustProfile(placeId),
      contacts: await this.store.listBusinessContactMethods(placeId),
      trustAudit: await this.store.listBusinessTrustAuditEvents(placeId),
      claimAudit: await this.store.listAuditEvents(placeId)
    };
  }

  private normalizeLinkByType(type: BusinessPlaceLinkType, value: string): string {
    if (type === "phone") {
      const normalizedPhone = normalizePhone(value);
      if (!normalizedPhone) throw new ValidationError(["phone link must be a valid phone number"]);
      return normalizedPhone;
    }

    if (type === "email") {
      const email = value.trim().toLowerCase();
      if (!/^[-a-z0-9._+]+@[-a-z0-9.]+\.[a-z]{2,}$/i.test(email)) throw new ValidationError(["email link must be a valid email"]);
      return email;
    }

    if (URL_LINK_TYPES.has(type)) {
      const normalizedUrl = normalizeUrl(value);
      if (!normalizedUrl) throw new ValidationError([`${type} link must be a valid http/https url`]);
      return normalizedUrl;
    }

    throw new ValidationError(["unsupported link type"]);
  }

  private inferVerificationLevel(evidence: Array<{ evidenceType: string }>): VerificationLevel {
    const set = new Set(evidence.map((e) => e.evidenceType));
    if (set.has("document") && set.has("email_domain")) return "high";
    if (set.has("document") || set.has("registration")) return "enhanced";
    if (set.size > 0) return "basic";
    return "none";
  }

  private async track(placeId: string, eventType: Parameters<VenueClaimStore["appendAuditEvent"]>[0]["eventType"], actorUserId: string | undefined, metadata: Record<string, unknown>) {
    await this.store.appendAuditEvent({ id: randomUUID(), placeId, eventType, actorUserId, metadata, createdAt: this.now().toISOString() });
  }

  // legacy compatibility
  public async createLead(input: unknown, ctx?: { userId?: string }) {
    const legacy = input as { venueId?: string; contactEmail?: string; message?: string };
    const draft = await this.createClaimDraft({ placeId: legacy.venueId, contactEmail: legacy.contactEmail, message: legacy.message, claimType: "sole_owner", requestedRole: "owner", verificationMethodSelection: ["email_domain"] }, { userId: ctx?.userId });
    const submitted = await this.submitClaim(draft.id, { userId: draft.claimantUserId });
    return { claimId: submitted.id, venueId: submitted.placeId, contactEmail: submitted.contactEmail, verificationStatus: submitted.status === "approved" ? "verified" : submitted.status === "rejected" ? "rejected" : "pending", createdAtISO: submitted.createdAt, updatedAtISO: submitted.updatedAt };
  }

  public async setStatus(claimId: string, status: "pending" | "verified" | "rejected") {
    const mapped: Record<string, ClaimStatus> = { pending: "under_review", verified: "approved", rejected: "rejected" };
    await this.store.updateClaim(claimId, { status: mapped[status], updatedAt: this.now().toISOString() });
  }
}

export type { OwnershipRole };
