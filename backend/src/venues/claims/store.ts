import type {
  BusinessClaimEvidenceRecord,
  BusinessManagedPlaceContentRecord,
  BusinessPlaceClaimRecord,
  ClaimAuditEvent,
  ClaimStatus,
  ListClaimsOptions,
  ListClaimsResult,
  PlaceBusinessOwnershipRecord
} from "./types.js";

export interface VenueClaimStore {
  createClaim(input: BusinessPlaceClaimRecord): Promise<void>;
  listClaims(opts?: ListClaimsOptions): Promise<ListClaimsResult>;
  getClaimById(claimId: string): Promise<BusinessPlaceClaimRecord | null>;
  updateClaim(claimId: string, patch: Partial<BusinessPlaceClaimRecord>): Promise<BusinessPlaceClaimRecord | null>;
  findClaimByPlaceAndUser(placeId: string, userId: string, statuses?: ClaimStatus[]): Promise<BusinessPlaceClaimRecord | null>;

  addEvidence(input: BusinessClaimEvidenceRecord): Promise<void>;
  listEvidence(claimId: string): Promise<BusinessClaimEvidenceRecord[]>;
  getEvidenceById(evidenceId: string): Promise<BusinessClaimEvidenceRecord | null>;
  updateEvidence(evidenceId: string, patch: Partial<BusinessClaimEvidenceRecord>): Promise<BusinessClaimEvidenceRecord | null>;

  upsertOwnership(input: PlaceBusinessOwnershipRecord): Promise<void>;
  listOwnershipByPlace(placeId: string): Promise<PlaceBusinessOwnershipRecord[]>;
  getOwnershipById(ownershipId: string): Promise<PlaceBusinessOwnershipRecord | null>;
  updateOwnership(ownershipId: string, patch: Partial<PlaceBusinessOwnershipRecord>): Promise<PlaceBusinessOwnershipRecord | null>;

  upsertBusinessContent(input: BusinessManagedPlaceContentRecord): Promise<void>;
  listBusinessContent(placeId: string): Promise<BusinessManagedPlaceContentRecord[]>;

  appendAuditEvent(input: ClaimAuditEvent): Promise<void>;
  listAuditEvents(placeId: string): Promise<ClaimAuditEvent[]>;
}
