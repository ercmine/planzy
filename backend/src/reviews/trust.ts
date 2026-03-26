export type ReviewerTrustStatus = "none" | "candidate" | "trusted" | "suspended" | "revoked";
export type ReviewerTrustTier = "none" | "emerging" | "core" | "elite";
export type ReviewTrustDesignation = "standard" | "verified" | "trusted" | "trusted_verified";
export type VerificationLevel = "none" | "weak" | "probable" | "verified" | "rejected";
export type TrustBadge = "trusted_reviewer" | "verified_visit" | "trusted_review" | "dryad_limited";
export type VerificationEvidenceType =
  | "check_in"
  | "location_proximity"
  | "location_dwell"
  | "location_session"
  | "timestamp_consistency"
  | "receipt"
  | "reservation"
  | "booking"
  | "ticket"
  | "purchase"
  | "on_site_media"
  | "media_geotime_match"
  | "qr_checkin"
  | "creator_onsite_capture"
  | "session_presence"
  | "admin_manual_verification"
  | "business_confirmation"
  | "behavioral_heuristic";

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

const TYPE_RELIABILITY: Record<VerificationEvidenceType, number> = {
  check_in: 0.8,
  location_proximity: 0.55,
  location_dwell: 0.75,
  location_session: 0.72,
  timestamp_consistency: 0.5,
  receipt: 0.92,
  reservation: 0.9,
  booking: 0.93,
  ticket: 0.9,
  purchase: 0.88,
  on_site_media: 0.7,
  media_geotime_match: 0.78,
  qr_checkin: 0.95,
  creator_onsite_capture: 0.78,
  session_presence: 0.65,
  admin_manual_verification: 1,
  business_confirmation: 0.6,
  behavioral_heuristic: 0.4
};

function toPublicLabel(level: VerificationLevel): ReviewVerificationSummary["publicLabel"] {
  if (level === "verified") return "Verified Visit";
  if (level === "probable") return "Probable Visit";
  if (level === "weak") return "Visit signal";
  return "Not verified";
}

export function aggregateVerificationLevel(evidence: VerificationEvidence[], now = new Date()): ReviewVerificationSummary {
  const nowMs = now.getTime();
  const reasonCodes = new Set<string>();
  const active = evidence.filter((item) => {
    if (item.evidenceStatus === "rejected") {
      reasonCodes.add("rejected_evidence_present");
      return false;
    }
    if (item.expiresAt && Date.parse(item.expiresAt) <= nowMs) {
      reasonCodes.add("expired_evidence_ignored");
      return false;
    }
    return item.evidenceStatus !== "expired";
  });

  if (active.length === 0) {
    return {
      reviewId: evidence[0]?.reviewId ?? "",
      verificationLevel: "none",
      verificationScore: 0,
      verifiedVisitBadgeEligible: false,
      evidenceCount: 0,
      publicLabel: "Not verified",
      internalReasonCodes: [...reasonCodes, "insufficient_evidence"],
      rankingWeightContribution: 0,
      computedAt: now.toISOString()
    };
  }

  let strongest = active[0]!;
  let weightedScore = 0;
  let suspiciousPenalty = 0;
  for (const item of active) {
    const reliability = TYPE_RELIABILITY[item.evidenceType] ?? 0.45;
    const recencyHours = Math.abs(nowMs - Date.parse(item.observedAt)) / (1000 * 60 * 60);
    const recencyFactor = recencyHours <= 24 ? 1 : recencyHours <= 72 ? 0.9 : 0.75;
    let proximityFactor = 1;
    const meters = Number(item.metadata?.distanceMeters ?? Number.NaN);
    if (!Number.isNaN(meters)) {
      if (meters <= 120) reasonCodes.add("location_close_match");
      proximityFactor = meters <= 120 ? 1 : meters <= 250 ? 0.8 : 0.5;
    }
    if (item.evidenceStatus === "suspect") suspiciousPenalty += 15;
    const contribution = item.confidenceScore * reliability * recencyFactor * proximityFactor;
    weightedScore += contribution;
    if (contribution > (strongest.confidenceScore * (TYPE_RELIABILITY[strongest.evidenceType] ?? 0.45))) strongest = item;
  }

  const hasAdminManual = active.some((item) => item.evidenceType === "admin_manual_verification" && item.evidenceStatus === "active");
  if (hasAdminManual) reasonCodes.add("admin_override_verified");

  if (active.some((item) => item.metadata?.impossibleTravel === true)) {
    reasonCodes.add("impossible_travel_penalty");
    suspiciousPenalty += 30;
  }

  let score = clamp(Math.round(weightedScore / Math.max(1, active.length) - suspiciousPenalty), 0, 100);
  if (hasAdminManual) score = Math.max(score, 96);
  const verificationLevel: VerificationLevel = score >= 80
    ? "verified"
    : score >= 58
      ? "probable"
      : score >= 30
        ? "weak"
        : "none";
  if (suspiciousPenalty >= 40 && score < 40) reasonCodes.add("suspicious_signals_downgraded");

  return {
    reviewId: active[0]?.reviewId ?? "",
    verificationLevel,
    verificationScore: score,
    verifiedVisitBadgeEligible: verificationLevel === "verified" || verificationLevel === "probable",
    primaryEvidenceType: strongest.evidenceType,
    evidenceCount: active.length,
    publicLabel: toPublicLabel(verificationLevel),
    internalReasonCodes: [...reasonCodes],
    rankingWeightContribution: verificationLevel === "verified" ? 14 : verificationLevel === "probable" ? 8 : verificationLevel === "weak" ? 3 : 0,
    computedAt: now.toISOString()
  };
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
  const verificationWeight = input.verificationLevel === "verified" ? 16 : input.verificationLevel === "probable" ? 10 : input.verificationLevel === "weak" ? 4 : input.verificationLevel === "rejected" ? -12 : 0;
  return Math.round(
    input.qualityScore * 0.35
    + input.helpfulCount * 1.5
    + input.reviewerTrustScore * 0.2
    + verificationWeight
    + Math.min(8, input.mediaCount * 2)
    - input.suspiciousPenalty * 0.6
  );
}
