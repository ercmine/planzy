export type ReviewerTrustStatus = "none" | "candidate" | "trusted" | "suspended" | "revoked";
export type ReviewerTrustTier = "none" | "emerging" | "core" | "elite";
export type ReviewTrustDesignation = "standard" | "verified" | "trusted" | "trusted_verified";
export type VerificationLevel = "none" | "weak" | "probable" | "verified" | "rejected";
export type TrustBadge = "trusted_reviewer" | "verified_visit" | "trusted_review" | "perbug_limited";
export type VerificationEvidenceType = "check_in" | "location_proximity" | "location_dwell" | "location_session" | "timestamp_consistency" | "receipt" | "reservation" | "booking" | "ticket" | "purchase" | "on_site_media" | "media_geotime_match" | "qr_checkin" | "creator_onsite_capture" | "session_presence" | "admin_manual_verification" | "business_confirmation" | "behavioral_heuristic";
export type VerificationEvidenceStatus = "active" | "expired" | "rejected" | "suspect";
export type VerificationSourceType = "system" | "admin" | "integration" | "user" | "partner";
export type EvidencePrivacyClass = "public_safe" | "sensitive" | "restricted";
export interface ReviewerTrustProfile {
    userId: string;
    trustStatus: ReviewerTrustStatus;
    trustTier: ReviewerTrustTier;
    trustScore: number;
    verifiedVisitStrengthAggregate: number;
    helpfulnessScore: number;
    moderationHealthScore: number;
    profileCompletenessScore: number;
    originalityScore: number;
    consistencyScore: number;
    reviewQualityScore: number;
    approvedReviewCount: number;
    rejectedReviewCount: number;
    suspiciousPenaltyScore: number;
    lastEvaluatedAt: string;
    trustGrantedAt?: string;
    trustRevokedAt?: string;
    trustRevocationReason?: string;
    manualOverrideStatus?: ReviewerTrustStatus;
    manualNotes?: string;
    createdAt: string;
    updatedAt: string;
}
export interface ReviewTrustSignals {
    reviewId: string;
    reviewerUserId: string;
    reviewerTrustStatusSnapshot: ReviewerTrustStatus;
    reviewTrustDesignation: ReviewTrustDesignation;
    verificationLevel: VerificationLevel;
    verificationScore: number;
    verificationPublicLabel: string;
    qualityScore: number;
    originalityScore: number;
    completenessScore: number;
    evidenceScore: number;
    helpfulnessScoreSnapshot: number;
    rankingBoostWeight: number;
    isTrustedEligible: boolean;
    trustReasons: string[];
    moderationEligible: boolean;
    badgeIds: TrustBadge[];
    createdAt: string;
    updatedAt: string;
}
export interface VerificationEvidence {
    id: string;
    userId: string;
    placeId: string;
    reviewId?: string;
    evidenceType: VerificationEvidenceType;
    sourceType: VerificationSourceType;
    sourceId?: string;
    evidenceStatus: VerificationEvidenceStatus;
    confidenceScore: number;
    strengthLevel: "weak" | "medium" | "strong";
    observedAt: string;
    startsAt?: string;
    endsAt?: string;
    expiresAt?: string;
    privacyClass: EvidencePrivacyClass;
    metadata?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}
export interface ReviewVerificationSummary {
    reviewId: string;
    verificationLevel: VerificationLevel;
    verificationScore: number;
    verifiedVisitBadgeEligible: boolean;
    primaryEvidenceType?: VerificationEvidenceType;
    evidenceCount: number;
    publicLabel: "Verified Visit" | "Probable Visit" | "Visit signal" | "Not verified";
    internalReasonCodes: string[];
    rankingWeightContribution: number;
    computedAt: string;
    overriddenByModerator?: string;
    overrideStatus?: "verified" | "rejected";
}
export interface TrustAuditLog {
    id: string;
    actorUserId: string;
    targetUserId: string;
    action: "grant" | "revoke" | "suspend" | "clear_override";
    previousStatus: ReviewerTrustStatus;
    newStatus: ReviewerTrustStatus;
    reason?: string;
    notes?: string;
    createdAt: string;
}
export declare function evaluateReviewQuality(input: {
    body: string;
    rating?: number;
    mediaCount: number;
    placeCategory?: string;
}): {
    qualityScore: number;
    originalityScore: number;
    completenessScore: number;
    trustReasons: string[];
    isTrustedEligible: boolean;
};
export declare function aggregateVerificationLevel(evidence: VerificationEvidence[], now?: Date): ReviewVerificationSummary;
export declare function deriveReviewerTrustStatus(score: number, moderationHealthScore: number, suspiciousPenaltyScore: number): {
    trustStatus: ReviewerTrustStatus;
    trustTier: ReviewerTrustTier;
};
export declare function computeRankingBoost(input: {
    qualityScore: number;
    helpfulCount: number;
    reviewerTrustScore: number;
    moderationState: "pending" | "published" | "hidden" | "removed" | "flagged";
    verificationLevel: VerificationLevel;
    mediaCount: number;
    suspiciousPenalty: number;
}): number;
