export type ClaimType = "sole_owner" | "manager_operator" | "organization_representative" | "franchise_representative";
export type ClaimStatus = "draft" | "submitted" | "pending_verification" | "under_review" | "needs_more_info" | "approved" | "partially_approved" | "rejected" | "withdrawn" | "expired" | "suspended" | "revoked";
export type VerificationLevel = "none" | "basic" | "enhanced" | "high";
export type EvidenceType = "email_domain" | "website_match" | "phone" | "document" | "registration" | "social_link" | "source_consistency" | "manual_note";
export type EvidenceStatus = "submitted" | "accepted" | "rejected" | "needs_more_info";
export type OwnershipRole = "owner" | "manager" | "operator" | "org_admin" | "franchise_manager";
export type OwnershipVerificationStatus = "pending" | "verified" | "revoked";
export interface BusinessPlaceClaimInput {
    placeId: string;
    claimType: ClaimType;
    requestedRole: OwnershipRole;
    contactEmail: string;
    contactPhone?: string;
    verificationMethodSelection?: EvidenceType[];
    claimantBusinessProfileId?: string;
    message?: string;
}
export interface ClaimActor {
    userId?: string;
    isAdmin?: boolean;
    businessProfileId?: string;
}
export interface BusinessPlaceClaimRecord {
    id: string;
    placeId: string;
    claimantUserId: string;
    claimantBusinessProfileId?: string;
    claimType: ClaimType;
    requestedRole: OwnershipRole;
    status: ClaimStatus;
    statusReasonCode?: string;
    verificationLevel: VerificationLevel;
    verificationMethodSelection: EvidenceType[];
    contactEmail: string;
    contactPhone?: string;
    message?: string;
    submittedAt?: string;
    reviewedAt?: string;
    reviewerUserId?: string;
    expiresAt?: string;
    withdrawnAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessClaimEvidenceInput {
    evidenceType: EvidenceType;
    normalizedValue?: string;
    storageRef?: string;
    metadata?: Record<string, unknown>;
    notes?: string;
}
export interface BusinessClaimEvidenceRecord {
    id: string;
    claimId: string;
    evidenceType: EvidenceType;
    status: EvidenceStatus;
    storageRef?: string;
    normalizedValue?: string;
    metadata: Record<string, unknown>;
    reviewedAt?: string;
    reviewerUserId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface PlaceBusinessOwnershipRecord {
    id: string;
    placeId: string;
    businessProfileId?: string;
    primaryUserId?: string;
    ownershipRole: OwnershipRole;
    verificationStatus: OwnershipVerificationStatus;
    verificationLevel: VerificationLevel;
    verificationMethodSummary: EvidenceType[];
    isPrimary: boolean;
    isActive: boolean;
    approvedClaimId?: string;
    approvedAt: string;
    revokedAt?: string;
    revokedReasonCode?: string;
    createdAt: string;
    updatedAt: string;
}
export type OfficialBusinessContentType = "description" | "photo" | "logo" | "hours" | "contact" | "links" | "amenities" | "menu" | "announcement" | "review_reply" | "qa_answer" | "cover_image" | "gallery_order";
export interface BusinessManagedPlaceContentRecord {
    id: string;
    placeId: string;
    businessProfileId?: string;
    ownershipId: string;
    contentType: OfficialBusinessContentType;
    value: Record<string, unknown>;
    moderationState: "pending" | "approved" | "rejected";
    sourceType: "official_business";
    visibility: "public" | "private";
    createdByUserId: string;
    createdAt: string;
    updatedAt: string;
}
export type ModerationStatus = "pending" | "approved" | "rejected";
export type VisibilityStatus = "draft" | "published" | "archived";
export interface BusinessManagedPlaceProfile {
    id: string;
    placeId: string;
    businessProfileId?: string;
    ownershipLinkId: string;
    status: "active" | "suspended";
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}
export interface OfficialBusinessDescription {
    id: string;
    placeId: string;
    businessProfileId?: string;
    content: string;
    moderationStatus: ModerationStatus;
    visibilityStatus: VisibilityStatus;
    authoredByUserId: string;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}
export interface BusinessPlaceCategorySuggestion {
    id: string;
    placeId: string;
    businessProfileId?: string;
    suggestedPrimaryCategoryId?: string;
    suggestedSecondaryCategoryIds: string[];
    reason?: string;
    status: "pending" | "approved" | "rejected";
    reviewedByUserId?: string;
    reviewedAt?: string;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessManagedHours {
    id: string;
    placeId: string;
    businessProfileId?: string;
    timezone: string;
    weeklyHours: Record<string, Array<{
        opens: string;
        closes: string;
    }>>;
    specialHours: Array<{
        date: string;
        intervals: Array<{
            opens: string;
            closes: string;
        }>;
    }>;
    temporaryClosureStatus?: "none" | "temporary" | "permanent";
    moderationStatus: ModerationStatus;
    effectiveStatus: "active" | "archived";
    createdAt: string;
    updatedAt: string;
}
export type BusinessPlaceLinkType = "website" | "phone" | "email" | "instagram" | "tiktok" | "facebook" | "youtube" | "reservation" | "booking" | "order" | "waitlist" | "menu" | "services" | "tickets" | "contact_form";
export interface BusinessPlaceLink {
    id: string;
    placeId: string;
    businessProfileId?: string;
    linkType: BusinessPlaceLinkType;
    url: string;
    label?: string;
    sortOrder: number;
    moderationStatus: ModerationStatus;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessPlaceMenuServiceCatalog {
    id: string;
    placeId: string;
    businessProfileId?: string;
    contentType: "menu" | "services";
    externalUrl?: string;
    structuredData: Record<string, unknown>;
    moderationStatus: ModerationStatus;
    visibility: VisibilityStatus;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessManagedPlaceImage {
    id: string;
    placeId: string;
    businessProfileId?: string;
    mediaAssetId: string;
    imageType: "exterior" | "interior" | "food_product" | "menu" | "team" | "services" | "ambiance" | "logo";
    caption?: string;
    altText?: string;
    sortOrder: number;
    moderationStatus: ModerationStatus;
    isCover: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessManagedChangeAuditRecord {
    id: string;
    placeId: string;
    entityType: "description" | "category" | "hours" | "link" | "gallery" | "menu_services";
    entityId: string;
    action: "created" | "updated" | "archived" | "approved" | "rejected";
    actorUserId?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface ClaimAuditEvent {
    id: string;
    claimId?: string;
    placeId: string;
    actorUserId?: string;
    eventType: "business_claim_started" | "business_claim_submitted" | "business_claim_evidence_uploaded" | "business_claim_requested_more_info" | "business_claim_approved" | "business_claim_rejected" | "business_claim_withdrawn" | "business_ownership_revoked" | "official_business_content_updated" | "official_business_reply_posted";
    metadata: Record<string, unknown>;
    createdAt: string;
}
export interface ListClaimsOptions {
    limit?: number;
    cursor?: string | null;
    placeId?: string;
    claimantUserId?: string;
    status?: ClaimStatus;
    reviewQueueOnly?: boolean;
}
export interface ListClaimsResult {
    claims: BusinessPlaceClaimRecord[];
    nextCursor?: string | null;
}
export interface ListClaimsOptionsNormalized {
    limit: number;
    cursor: string | null;
    placeId?: string;
    claimantUserId?: string;
    status?: ClaimStatus;
    reviewQueueOnly?: boolean;
}
export type VerificationStatus = "pending" | "verified" | "rejected";
export type BusinessClaimedStatus = "unclaimed" | "claimed_pending" | "claimed" | "claim_disputed" | "claim_revoked";
export type BusinessContactMethodType = "phone" | "email" | "website" | "booking_url" | "contact_url" | "social";
export type ContactVerificationStatus = "unverified" | "pending_verification" | "verified" | "failed" | "revoked";
export type ContactVerificationMethod = "email_code" | "sms_code" | "admin_manual" | "domain_proof" | "import_trusted_source" | "unsupported";
export type BusinessCompletenessTier = "low" | "partial" | "good" | "strong";
export interface BusinessTrustProfile {
    id: string;
    placeId: string;
    businessProfileId?: string;
    claimedStatus: BusinessClaimedStatus;
    completenessScore: number;
    completenessTier: BusinessCompletenessTier;
    trustTier: "none" | "developing" | "trusted";
    trustFlags: string[];
    passedChecks: string[];
    missingFields: string[];
    warnings: string[];
    recomputedAt: string;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessContactMethodRecord {
    id: string;
    placeId: string;
    businessProfileId?: string;
    type: BusinessContactMethodType;
    value: string;
    normalizedValue: string;
    isPrimary: boolean;
    verificationStatus: ContactVerificationStatus;
    verificationMethod: ContactVerificationMethod;
    verifiedAt?: string;
    verifiedByActorId?: string;
    lastVerificationAttemptAt?: string;
    revokedAt?: string;
    failureReasonCode?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface BusinessTrustAuditEvent {
    id: string;
    placeId: string;
    businessProfileId?: string;
    actorType: "system" | "user" | "admin";
    actorId?: string;
    eventType: "business_trust_recomputed" | "business_contact_added" | "business_contact_verification_started" | "business_contact_verified" | "business_contact_verification_failed" | "business_contact_verification_revoked" | "business_badge_suppressed" | "business_badge_unsuppressed";
    payload: Record<string, unknown>;
    createdAt: string;
}
export interface BusinessTrustBadge {
    key: "claimed" | "verified_contact" | "complete_profile" | "trusted_business";
    label: string;
    description: string;
    priority: number;
}
export interface BusinessTrustPublicView {
    claimedStatus: BusinessClaimedStatus;
    isClaimed: boolean;
    verifiedContactTypes: BusinessContactMethodType[];
    profileCompletenessTier: BusinessCompletenessTier;
    profileCompletenessLabel: string;
    trustTier: "none" | "developing" | "trusted";
    trustSummary: string;
    badges: BusinessTrustBadge[];
}
