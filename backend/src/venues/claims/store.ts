import type { ListClaimsOptions, ListClaimsResult, VerificationStatus, VenueClaimLeadRecord } from "./types.js";

export interface VenueClaimStore {
  create(input: VenueClaimLeadRecord): Promise<void>;
  list(opts?: ListClaimsOptions): Promise<ListClaimsResult>;
  getById(claimId: string): Promise<VenueClaimLeadRecord | null>;
  updateStatus(claimId: string, status: VerificationStatus, meta?: { updatedAtISO: string }): Promise<void>;
  findByVenueAndEmail(venueId: string, contactEmail: string): Promise<VenueClaimLeadRecord | null>;
}
