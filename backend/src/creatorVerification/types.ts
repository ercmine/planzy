export type CreatorVerificationStatus = "not_applied" | "draft" | "submitted" | "under_review" | "needs_more_info" | "approved" | "rejected" | "revoked";
export type CreatorVerificationEligibilitySeverity = "blocking" | "warning";
export type CreatorVerificationEligibilityCode = "creator_profile_required" | "creator_profile_public" | "creator_profile_active" | "creator_bio_required" | "creator_avatar_required" | "creator_handle_required" | "minimum_public_content" | "minimum_account_age_days" | "recent_moderation_issue" | "creator_suspended";
export interface CreatorVerificationEligibilityCheck { code: CreatorVerificationEligibilityCode; passed: boolean; severity: CreatorVerificationEligibilitySeverity; message: string; }
export interface CreatorVerificationEligibilityResult { eligible: boolean; checks: CreatorVerificationEligibilityCheck[]; failedChecks: CreatorVerificationEligibilityCheck[]; warnings: CreatorVerificationEligibilityCheck[]; summary: string; evaluatedAt: string; }
export interface CreatorVerificationApplicationDraft { reason: string; niche?: string; cityRegion?: string; portfolioLinks: string[]; socialLinks: string[]; evidence?: string; }
export type CreatorVerificationRejectionReasonCode = "incomplete_profile" | "insufficient_creator_activity" | "failed_authenticity_review" | "unresolved_moderation_concerns" | "duplicate_or_invalid_application" | "unsupported_creator_type" | "other";
export type CreatorVerificationRevocationReasonCode = "policy_violation" | "impersonation_concern" | "ownership_change" | "moderation_findings" | "claims_no_longer_hold" | "creator_requested" | "other";
export type CreatorVerificationAuditEventType = "draft_created" | "draft_updated" | "application_submitted" | "under_review" | "needs_more_info" | "approved" | "rejected" | "revoked" | "reapplication_submitted";
export interface CreatorVerificationApplication {
  id: string; creatorProfileId: string; userId: string; status: CreatorVerificationStatus; draft: CreatorVerificationApplicationDraft;
  eligibilitySnapshot?: CreatorVerificationEligibilityResult;
  profileSnapshot?: { displayName: string; handle?: string; bio?: string; avatarUrl?: string; slug: string; followerCount: number; publicReviewsCount: number; publicGuidesCount: number; };
  submittedAt?: string; reviewedAt?: string; reviewedBy?: string; approvedAt?: string; rejectedAt?: string; revokedAt?: string;
  rejectionReasonCode?: CreatorVerificationRejectionReasonCode; revocationReasonCode?: CreatorVerificationRevocationReasonCode; internalNotes?: string; publicMessage?: string; reapplyEligibleAt?: string; createdAt: string; updatedAt: string;
}
export interface CreatorVerificationAuditEvent { id: string; applicationId: string; creatorProfileId: string; actorUserId: string; eventType: CreatorVerificationAuditEventType; details?: Record<string, unknown>; createdAt: string; }
export interface CreatorVerificationAdminListFilter { status?: CreatorVerificationStatus; creatorProfileId?: string; userId?: string; }
export interface CreatorVerificationPublicBadge { isVerified: boolean; label?: string; badgeType?: "verified_creator"; approvedAt?: string; }
export interface CreatorVerificationConfig { minAccountAgeDays: number; minPublicContentCount: number; rejectionCooldownDays: number; blockOnModerationFlags: string[]; }
export const DEFAULT_CREATOR_VERIFICATION_CONFIG: CreatorVerificationConfig = { minAccountAgeDays: 0, minPublicContentCount: 0, rejectionCooldownDays: 14, blockOnModerationFlags: ["severe_recent_violation", "creator_suspended"] };
