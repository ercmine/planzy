export type ReviewerTrustStatus = "none" | "candidate" | "trusted" | "suspended" | "revoked";
export type ReviewerTrustTier = "none" | "emerging" | "core" | "elite";
export type ReviewTrustDesignation = "standard" | "verified" | "trusted" | "trusted_verified";
export type VerificationLevel = "none" | "weak" | "probable" | "verified";
export type TrustBadge = "trusted_reviewer" | "verified_visit" | "trusted_review" | "perbug_limited";
export type VerificationEvidenceType =
  | "check_in"
  | "geolocation"
  | "receipt"
  | "reservation"
  | "on_site_media"
  | "session_presence"
  | "admin_manual"
  | "business_confirmation"
  | "behavioral_heuristic";

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
  evidenceType: VerificationEvidenceType;
  evidenceStrength: number;
  source: "system" | "admin" | "integration" | "user";
  linkedReviewId?: string;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
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

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function calculateOriginalityScore(body: string): number {
  const normalized = body.trim().toLowerCase();
  if (!normalized) return 0;
  const words = normalized.split(/\s+/g).filter(Boolean);
  const unique = new Set(words);
  const diversity = unique.size / Math.max(words.length, 1);
  const boilerplatePhrases = ["great place", "nice place", "good service", "bad service", "would come again"];
  const boilerplatePenalty = boilerplatePhrases.some((phrase) => normalized.includes(phrase)) ? 15 : 0;
  return clamp(Math.round(diversity * 100) - boilerplatePenalty);
}

export function evaluateReviewQuality(input: {
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
} {
  const text = input.body.trim();
  const reasons: string[] = [];
  const wordCount = text.split(/\s+/g).filter(Boolean).length;
  const originalityScore = calculateOriginalityScore(text);

  let completenessScore = 0;
  if (wordCount >= 20) completenessScore += 45;
  else if (wordCount >= 10) completenessScore += 25;
  else completenessScore += 5;
  if (input.mediaCount > 0) completenessScore += 20;
  if (/[,.!?]/.test(text)) completenessScore += 10;

  const lower = text.toLowerCase();
  const categoryHints: Record<string, string[]> = {
    restaurant: ["food", "service", "menu", "price", "ambience"],
    hotel: ["room", "check", "staff", "location", "clean"],
    attraction: ["crowd", "time", "ticket", "experience", "tip"]
  };
  const hints = input.placeCategory ? categoryHints[input.placeCategory.toLowerCase()] ?? [] : [];
  if (hints.length > 0) {
    const hits = hints.filter((hint) => lower.includes(hint)).length;
    completenessScore += Math.min(20, hits * 5);
  }

  let qualityScore = Math.round((completenessScore * 0.55) + (originalityScore * 0.45));
  if (wordCount < 8) {
    qualityScore -= 25;
    reasons.push("low_word_count");
  }
  if (/(.)\1{6,}/.test(lower)) {
    qualityScore -= 20;
    reasons.push("repetitive_text");
  }
  if (input.rating && input.rating <= 2 && /(amazing|perfect|great|excellent)/.test(lower)) {
    qualityScore -= 12;
    reasons.push("rating_text_mismatch");
  }

  qualityScore = clamp(qualityScore);
  completenessScore = clamp(completenessScore);

  const isTrustedEligible = wordCount >= 20 && qualityScore >= 72 && originalityScore >= 55;
  if (isTrustedEligible) reasons.push("trusted_quality_threshold_met");
  if (input.mediaCount > 0) reasons.push("has_media_evidence");

  return { qualityScore, originalityScore, completenessScore, trustReasons: reasons, isTrustedEligible };
}

export function aggregateVerificationLevel(evidence: VerificationEvidence[]): { verificationLevel: VerificationLevel; evidenceScore: number } {
  const now = Date.now();
  const active = evidence.filter((item) => !item.expiresAt || Date.parse(item.expiresAt) > now);
  const total = active.reduce((sum, item) => sum + item.evidenceStrength, 0);
  if (total >= 180) return { verificationLevel: "verified", evidenceScore: 100 };
  if (total >= 100) return { verificationLevel: "probable", evidenceScore: 72 };
  if (total >= 40) return { verificationLevel: "weak", evidenceScore: 40 };
  return { verificationLevel: "none", evidenceScore: 0 };
}

export function deriveReviewerTrustStatus(score: number, moderationHealthScore: number, suspiciousPenaltyScore: number): {
  trustStatus: ReviewerTrustStatus;
  trustTier: ReviewerTrustTier;
} {
  if (moderationHealthScore < 35 || suspiciousPenaltyScore >= 50) return { trustStatus: "suspended", trustTier: "none" };
  if (score >= 85) return { trustStatus: "trusted", trustTier: "elite" };
  if (score >= 72) return { trustStatus: "trusted", trustTier: "core" };
  if (score >= 58) return { trustStatus: "candidate", trustTier: "emerging" };
  return { trustStatus: "none", trustTier: "none" };
}

export function computeRankingBoost(input: {
  qualityScore: number;
  helpfulCount: number;
  reviewerTrustScore: number;
  moderationState: "pending" | "published" | "hidden" | "removed" | "flagged";
  verificationLevel: VerificationLevel;
  mediaCount: number;
  suspiciousPenalty: number;
}): number {
  if (input.moderationState !== "published") return -20;
  const verificationWeight = input.verificationLevel === "verified" ? 16 : input.verificationLevel === "probable" ? 10 : input.verificationLevel === "weak" ? 4 : 0;
  return Math.round(
    input.qualityScore * 0.35
    + input.helpfulCount * 1.5
    + input.reviewerTrustScore * 0.2
    + verificationWeight
    + Math.min(8, input.mediaCount * 2)
    - input.suspiciousPenalty * 0.6
  );
}
