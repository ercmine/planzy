import type { BusinessManagedHours, BusinessManagedPlaceContentRecord, BusinessManagedPlaceImage, BusinessPlaceCategorySuggestion, BusinessPlaceClaimRecord, BusinessPlaceLink, BusinessPlaceLinkType, BusinessTrustPublicView, ContactVerificationMethod, ContactVerificationStatus, BusinessPlaceMenuServiceCatalog, ClaimActor, ListClaimsResult, OfficialBusinessDescription, OwnershipRole, PlaceBusinessOwnershipRecord, VerificationLevel } from "./types.js";
import type { VenueClaimStore } from "./store.js";
export declare class VenueClaimsService {
    private readonly store;
    private readonly now;
    private readonly trustService;
    constructor(store: VenueClaimStore, now?: () => Date);
    private requireUser;
    private assertCanReview;
    getActiveOwnershipForBusinessActor(input: {
        placeId: string;
        businessProfileId: string;
        userId: string;
    }): Promise<PlaceBusinessOwnershipRecord>;
    private assertCanManageClaimedPlace;
    createClaimDraft(input: unknown, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord>;
    submitClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord>;
    listLeads(opts?: unknown, actor?: ClaimActor): Promise<ListClaimsResult>;
    getClaim(claimId: string, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord>;
    addEvidence(claimId: string, input: unknown, actor?: ClaimActor): Promise<{
        notes?: string | undefined;
        storageRef?: string | undefined;
        normalizedValue?: string | undefined;
        id: `${string}-${string}-${string}-${string}-${string}`;
        claimId: string;
        evidenceType: import("./types.js").EvidenceType;
        status: "submitted";
        metadata: Record<string, unknown>;
        createdAt: string;
        updatedAt: string;
    }>;
    listEvidence(claimId: string, actor?: ClaimActor): Promise<import("./types.js").BusinessClaimEvidenceRecord[]>;
    reviewClaim(claimId: string, decision: "approve" | "reject" | "request_more_info", reasonCode: string, notes: string | undefined, actor?: ClaimActor): Promise<BusinessPlaceClaimRecord | null>;
    revokeOwnership(ownershipId: string, reasonCode: string, actor?: ClaimActor): Promise<void>;
    updateOfficialDescription(placeId: string, content: unknown, actor?: ClaimActor): Promise<OfficialBusinessDescription>;
    submitCategorySuggestion(placeId: string, input: {
        primaryCategoryId?: string;
        secondaryCategoryIds?: string[];
        reason?: string;
    }, actor?: ClaimActor): Promise<BusinessPlaceCategorySuggestion>;
    updateManagedHours(placeId: string, input: Omit<BusinessManagedHours, "id" | "placeId" | "createdAt" | "updatedAt" | "businessProfileId">, actor?: ClaimActor): Promise<BusinessManagedHours>;
    upsertBusinessLink(placeId: string, input: {
        linkType: BusinessPlaceLinkType;
        value: string;
        label?: string;
        sortOrder?: number;
    }, actor?: ClaimActor): Promise<BusinessPlaceLink>;
    upsertMenuServices(placeId: string, input: {
        contentType: "menu" | "services";
        externalUrl?: string;
        structuredData?: Record<string, unknown>;
    }, actor?: ClaimActor): Promise<BusinessPlaceMenuServiceCatalog>;
    upsertBusinessImage(placeId: string, input: Omit<BusinessManagedPlaceImage, "id" | "placeId" | "createdAt" | "updatedAt" | "businessProfileId" | "moderationStatus">, actor?: ClaimActor): Promise<BusinessManagedPlaceImage>;
    upsertOfficialContent(placeId: string, ownershipId: string, contentType: BusinessManagedPlaceContentRecord["contentType"], value: Record<string, unknown>, actor?: ClaimActor): Promise<BusinessManagedPlaceContentRecord>;
    getPlaceManagementState(placeId: string, actor?: ClaimActor): Promise<{
        ownership: PlaceBusinessOwnershipRecord[];
        content: BusinessManagedPlaceContentRecord[];
        description: OfficialBusinessDescription | null;
        hours: BusinessManagedHours | null;
        links: BusinessPlaceLink[];
        catalogs: BusinessPlaceMenuServiceCatalog[];
        images: BusinessManagedPlaceImage[];
        categories: BusinessPlaceCategorySuggestion[];
        canManage: boolean;
    }>;
    buildPublicPlaceProjection(placeId: string, providerData: Record<string, unknown>): Promise<{
        provider: Record<string, unknown>;
        merged: {
            description: {
                value: unknown;
                source: string;
            };
            hours: {
                value: unknown;
                source: string;
            };
            website: {
                value: unknown;
                source: string;
            };
            categories: {
                value: {
                    provider: unknown;
                    businessSuggestion: {
                        primary: string | undefined;
                        secondary: string[];
                    } | null;
                };
                source: string;
            };
            images: {
                officialCover: string | null;
                official: BusinessManagedPlaceImage[];
                provider: unknown;
            };
            links: BusinessPlaceLink[];
            menuServices: BusinessPlaceMenuServiceCatalog[];
        };
        official: {
            isManaged: boolean;
            verifiedBadge: boolean;
            verificationLevel: VerificationLevel | undefined;
            attribution: string;
        };
        sourcePrecedence: string[];
        trust: BusinessTrustPublicView;
    }>;
    upsertBusinessContactMethod(placeId: string, input: {
        type: "phone" | "email" | "website" | "booking_url" | "contact_url" | "social";
        value: string;
        isPrimary?: boolean;
    }, actor?: ClaimActor): Promise<import("./types.js").BusinessContactMethodRecord>;
    listBusinessContactMethods(placeId: string, actor?: ClaimActor): Promise<import("./types.js").BusinessContactMethodRecord[]>;
    verifyBusinessContactMethod(placeId: string, contactMethodId: string, input: {
        status: ContactVerificationStatus;
        method?: ContactVerificationMethod;
        reasonCode?: string;
    }, actor?: ClaimActor): Promise<import("./types.js").BusinessContactMethodRecord>;
    getBusinessTrustStatus(placeId: string, actor?: ClaimActor): Promise<{
        publicView: BusinessTrustPublicView;
        internal: unknown;
    }>;
    getAdminBusinessTrustState(placeId: string, actor?: ClaimActor): Promise<{
        publicView: BusinessTrustPublicView;
        trustProfile: import("./types.js").BusinessTrustProfile | null;
        contacts: import("./types.js").BusinessContactMethodRecord[];
        trustAudit: import("./types.js").BusinessTrustAuditEvent[];
        claimAudit: import("./types.js").ClaimAuditEvent[];
    }>;
    private normalizeLinkByType;
    private inferVerificationLevel;
    private track;
    createLead(input: unknown, ctx?: {
        userId?: string;
    }): Promise<{
        claimId: string;
        venueId: string;
        contactEmail: string;
        verificationStatus: string;
        createdAtISO: string;
        updatedAtISO: string;
    }>;
    setStatus(claimId: string, status: "pending" | "verified" | "rejected"): Promise<void>;
}
export type { OwnershipRole };
