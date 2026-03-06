export type VerificationStatus = "pending" | "verified" | "rejected";

export interface VenueClaimLeadInput {
  venueId: string;
  contactEmail: string;
  message?: string;
  userId?: string;
  planId?: string;
  provider?: string;
}

export interface VenueClaimLeadRecord {
  claimId: string;
  venueId: string;
  contactEmail: string;
  verificationStatus: VerificationStatus;
  message?: string;
  userId?: string;
  planId?: string;
  provider?: string;
  createdAtISO: string;
  updatedAtISO?: string;
}

export interface ListClaimsOptions {
  limit?: number;
  cursor?: string | null;
  venueId?: string;
  status?: VerificationStatus;
}

export interface ListClaimsResult {
  claims: VenueClaimLeadRecord[];
  nextCursor?: string | null;
}

export interface ListClaimsOptionsNormalized {
  limit: number;
  cursor: string | null;
  venueId?: string;
  status?: VerificationStatus;
}
