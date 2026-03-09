import { randomUUID } from "node:crypto";

import { CreatorProfileStatus, type CreatorProfile } from "../accounts/types.js";
import { ValidationError } from "../plans/errors.js";
import type { CreatorVerificationStore } from "./store.js";
import { DEFAULT_CREATOR_VERIFICATION_CONFIG, type CreatorVerificationApplication, type CreatorVerificationApplicationDraft, type CreatorVerificationConfig, type CreatorVerificationEligibilityCheck, type CreatorVerificationEligibilityResult, type CreatorVerificationPublicBadge, type CreatorVerificationRejectionReasonCode, type CreatorVerificationRevocationReasonCode, type CreatorVerificationStatus } from "./types.js";

interface CreatorVerificationDeps {
  getCreatorProfileByUserId(userId: string): CreatorProfile | undefined;
  getCreatorProfileById(creatorProfileId: string): CreatorProfile | undefined;
  updateCreatorProfile(profile: CreatorProfile): void;
  getUser(userId: string): { createdAt: string; moderationFlags: string[] } | undefined;
}

const MAX_LINKS = 6;

function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function addCheck(checks: CreatorVerificationEligibilityCheck[], check: CreatorVerificationEligibilityCheck): void {
  checks.push(check);
}

export function getCreatorVerificationBadge(status: CreatorVerificationStatus, approvedAt?: string): CreatorVerificationPublicBadge {
  if (status !== "approved") return { isVerified: false };
  return { isVerified: true, badgeType: "verified_creator", label: "Verified Creator", approvedAt };
}

export class CreatorVerificationService {
  constructor(private readonly store: CreatorVerificationStore, private readonly deps: CreatorVerificationDeps, private readonly config: CreatorVerificationConfig = DEFAULT_CREATOR_VERIFICATION_CONFIG) {}

  getEligibilityForUser(userId: string): CreatorVerificationEligibilityResult {
    const now = new Date();
    const checks: CreatorVerificationEligibilityCheck[] = [];
    const creator = this.deps.getCreatorProfileByUserId(userId);
    const user = this.deps.getUser(userId);

    addCheck(checks, { code: "creator_profile_required", passed: Boolean(creator), severity: "blocking", message: creator ? "Creator profile found." : "Create a creator profile before applying." });
    addCheck(checks, { code: "creator_profile_public", passed: Boolean(creator?.isPublic), severity: "blocking", message: creator?.isPublic ? "Profile is public." : "Creator profile must be public." });
    addCheck(checks, { code: "creator_profile_active", passed: creator?.status === CreatorProfileStatus.ACTIVE, severity: "blocking", message: creator?.status === CreatorProfileStatus.ACTIVE ? "Profile is active." : "Creator profile must be active." });
    addCheck(checks, { code: "creator_bio_required", passed: Boolean(creator?.bio?.trim()), severity: "blocking", message: creator?.bio?.trim() ? "Bio is present." : "Add a creator bio before applying." });
    addCheck(checks, { code: "creator_avatar_required", passed: Boolean(creator?.avatarUrl), severity: "blocking", message: creator?.avatarUrl ? "Avatar is present." : "Add an avatar/profile image before applying." });
    addCheck(checks, { code: "creator_handle_required", passed: Boolean(creator?.handle?.trim()), severity: "blocking", message: creator?.handle?.trim() ? "Handle is present." : "Add a public handle before applying." });

    const contentCount = (creator?.publicGuidesCount ?? 0) + (creator?.publicReviewsCount ?? 0);
    addCheck(checks, { code: "minimum_public_content", passed: contentCount >= this.config.minPublicContentCount, severity: "blocking", message: contentCount >= this.config.minPublicContentCount ? "Sufficient public creator content." : `Publish at least ${this.config.minPublicContentCount} public reviews/guides before applying.` });

    const ageDays = user ? Math.floor((now.getTime() - new Date(user.createdAt).getTime()) / 86_400_000) : 0;
    addCheck(checks, { code: "minimum_account_age_days", passed: ageDays >= this.config.minAccountAgeDays, severity: "blocking", message: ageDays >= this.config.minAccountAgeDays ? "Account age requirement met." : `Account must be at least ${this.config.minAccountAgeDays} days old.` });

    const hasModerationFlags = Boolean(user?.moderationFlags?.some((flag) => this.config.blockOnModerationFlags.includes(flag)));
    addCheck(checks, { code: "recent_moderation_issue", passed: !hasModerationFlags, severity: "blocking", message: hasModerationFlags ? "Recent moderation issues block verification." : "No blocking moderation issues found." });
    addCheck(checks, { code: "creator_suspended", passed: creator?.status !== CreatorProfileStatus.SUSPENDED, severity: "blocking", message: creator?.status === CreatorProfileStatus.SUSPENDED ? "Suspended creators cannot apply." : "Creator is not suspended." });

    const failedChecks = checks.filter((c) => !c.passed && c.severity === "blocking");
    const warnings = checks.filter((c) => !c.passed && c.severity === "warning");
    return {
      eligible: failedChecks.length === 0,
      checks,
      failedChecks,
      warnings,
      summary: failedChecks.length === 0 ? "Eligible to apply for creator verification." : "Not yet eligible. Resolve blocking requirements and try again.",
      evaluatedAt: now.toISOString()
    };
  }

  getStatusForUser(userId: string): { creatorProfileId?: string; status: CreatorVerificationStatus; badge: CreatorVerificationPublicBadge; application?: CreatorVerificationApplication } {
    const creator = this.deps.getCreatorProfileByUserId(userId);
    if (!creator) return { status: "not_applied", badge: { isVerified: false } };
    const app = this.store.getLatestForCreator(creator.id);
    if (!app) return { creatorProfileId: creator.id, status: "not_applied", badge: { isVerified: false } };
    return { creatorProfileId: creator.id, status: app.status, badge: getCreatorVerificationBadge(app.status, app.approvedAt), application: app };
  }

  saveDraft(userId: string, draft: Partial<CreatorVerificationApplicationDraft>): CreatorVerificationApplication {
    const creator = this.deps.getCreatorProfileByUserId(userId);
    if (!creator) throw new Error("CREATOR_PROFILE_REQUIRED");
    const current = this.store.getLatestForCreator(creator.id);
    if (current && ["submitted", "under_review"].includes(current.status)) throw new Error("ACTIVE_APPLICATION_EXISTS");

    const now = new Date().toISOString();
    const mergedDraft: CreatorVerificationApplicationDraft = {
      reason: String(draft.reason ?? current?.draft.reason ?? "").trim().slice(0, 400),
      niche: draft.niche?.slice(0, 120) ?? current?.draft.niche,
      cityRegion: draft.cityRegion?.slice(0, 120) ?? current?.draft.cityRegion,
      portfolioLinks: (draft.portfolioLinks ?? current?.draft.portfolioLinks ?? []).filter((u) => isHttpUrl(u)).slice(0, MAX_LINKS),
      socialLinks: (draft.socialLinks ?? current?.draft.socialLinks ?? []).filter((u) => isHttpUrl(u)).slice(0, MAX_LINKS),
      evidence: draft.evidence?.slice(0, 1000) ?? current?.draft.evidence
    };

    const app: CreatorVerificationApplication = {
      ...(current && ["draft", "needs_more_info"].includes(current.status) ? current : { id: `cva_${randomUUID()}`, createdAt: now }),
      creatorProfileId: creator.id,
      userId,
      status: "draft",
      draft: mergedDraft,
      updatedAt: now
    } as CreatorVerificationApplication;

    this.store.saveApplication(app);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: app.id, creatorProfileId: creator.id, actorUserId: userId, eventType: current ? "draft_updated" : "draft_created", createdAt: now });
    return app;
  }

  submit(userId: string): CreatorVerificationApplication {
    const creator = this.deps.getCreatorProfileByUserId(userId);
    if (!creator) throw new Error("CREATOR_PROFILE_REQUIRED");

    const current = this.store.getLatestForCreator(creator.id);
    if (!current || !["draft", "needs_more_info", "rejected", "revoked"].includes(current.status)) throw new Error("DRAFT_REQUIRED");
    if ((current.reapplyEligibleAt ?? "") > new Date().toISOString()) throw new Error("REAPPLY_COOLDOWN_ACTIVE");

    const eligibility = this.getEligibilityForUser(userId);
    if (!eligibility.eligible) throw new ValidationError(["creator not eligible"], eligibility.failedChecks.map((check) => `${check.code}:${check.message}`).join("; "));

    const now = new Date().toISOString();
    const next: CreatorVerificationApplication = {
      ...current,
      status: "submitted",
      submittedAt: now,
      eligibilitySnapshot: eligibility,
      profileSnapshot: {
        displayName: creator.displayName,
        handle: creator.handle,
        bio: creator.bio,
        avatarUrl: creator.avatarUrl,
        slug: creator.slug,
        followerCount: creator.followerCount,
        publicReviewsCount: creator.publicReviewsCount,
        publicGuidesCount: creator.publicGuidesCount
      },
      updatedAt: now,
      reviewedAt: undefined,
      reviewedBy: undefined,
      rejectedAt: undefined,
      rejectionReasonCode: undefined,
      revocationReasonCode: undefined,
      revokedAt: undefined,
      internalNotes: undefined
    };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId: creator.id, actorUserId: userId, eventType: current.status === "draft" ? "application_submitted" : "reapplication_submitted", createdAt: now, details: { eligibilityPassed: true } });
    return next;
  }

  transitionToUnderReview(adminUserId: string, applicationId: string, note?: string): CreatorVerificationApplication {
    const app = this.requireApplication(applicationId);
    if (app.status !== "submitted") throw new Error("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const next = { ...app, status: "under_review" as const, reviewedBy: adminUserId, reviewedAt: now, internalNotes: note?.slice(0, 1000), updatedAt: now };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId: next.creatorProfileId, actorUserId: adminUserId, eventType: "under_review", createdAt: now });
    return next;
  }

  requestMoreInfo(adminUserId: string, applicationId: string, publicMessage: string, note?: string): CreatorVerificationApplication {
    const app = this.requireApplication(applicationId);
    if (!["submitted", "under_review"].includes(app.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const now = new Date().toISOString();
    const next = { ...app, status: "needs_more_info" as const, reviewedBy: adminUserId, reviewedAt: now, publicMessage: publicMessage.slice(0, 300), internalNotes: note?.slice(0, 1000), updatedAt: now };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId: next.creatorProfileId, actorUserId: adminUserId, eventType: "needs_more_info", createdAt: now });
    return next;
  }

  approve(adminUserId: string, applicationId: string, note?: string): CreatorVerificationApplication {
    const app = this.requireApplication(applicationId);
    if (!["submitted", "under_review", "needs_more_info"].includes(app.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const profile = this.deps.getCreatorProfileById(app.creatorProfileId);
    if (!profile) throw new Error("CREATOR_NOT_FOUND");
    const now = new Date().toISOString();
    const next = { ...app, status: "approved" as const, approvedAt: now, reviewedBy: adminUserId, reviewedAt: now, internalNotes: note?.slice(0, 1000), updatedAt: now };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId: next.creatorProfileId, actorUserId: adminUserId, eventType: "approved", createdAt: now });
    this.deps.updateCreatorProfile({ ...profile, badges: [...new Set([...(profile.badges ?? []), "verified_creator"])] });
    return next;
  }

  reject(adminUserId: string, applicationId: string, reasonCode: CreatorVerificationRejectionReasonCode, publicMessage: string, note?: string): CreatorVerificationApplication {
    const app = this.requireApplication(applicationId);
    if (!["submitted", "under_review", "needs_more_info"].includes(app.status)) throw new Error("INVALID_STATUS_TRANSITION");
    const profile = this.deps.getCreatorProfileById(app.creatorProfileId);
    const now = new Date().toISOString();
    const reapplyEligibleAt = new Date(Date.now() + this.config.rejectionCooldownDays * 86_400_000).toISOString();
    const next = { ...app, status: "rejected" as const, rejectedAt: now, reviewedBy: adminUserId, reviewedAt: now, rejectionReasonCode: reasonCode, publicMessage: publicMessage.slice(0, 300), internalNotes: note?.slice(0, 1000), reapplyEligibleAt, updatedAt: now };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId: next.creatorProfileId, actorUserId: adminUserId, eventType: "rejected", createdAt: now, details: { reasonCode } });
    if (profile) this.deps.updateCreatorProfile({ ...profile, badges: (profile.badges ?? []).filter((badge) => badge !== "verified_creator") });
    return next;
  }

  revoke(adminUserId: string, creatorProfileId: string, reasonCode: CreatorVerificationRevocationReasonCode, publicMessage: string, note?: string): CreatorVerificationApplication {
    const app = this.store.getLatestForCreator(creatorProfileId);
    if (!app || app.status !== "approved") throw new Error("APPROVED_APPLICATION_REQUIRED");
    const profile = this.deps.getCreatorProfileById(creatorProfileId);
    if (!profile) throw new Error("CREATOR_NOT_FOUND");
    const now = new Date().toISOString();
    const next = { ...app, status: "revoked" as const, revokedAt: now, reviewedBy: adminUserId, reviewedAt: now, revocationReasonCode: reasonCode, publicMessage: publicMessage.slice(0, 300), internalNotes: note?.slice(0, 1000), reapplyEligibleAt: new Date(Date.now() + this.config.rejectionCooldownDays * 86_400_000).toISOString(), updatedAt: now };
    this.store.saveApplication(next);
    this.store.saveAuditEvent({ id: `cvae_${randomUUID()}`, applicationId: next.id, creatorProfileId, actorUserId: adminUserId, eventType: "revoked", createdAt: now, details: { reasonCode } });
    this.deps.updateCreatorProfile({ ...profile, badges: (profile.badges ?? []).filter((badge) => badge !== "verified_creator") });
    return next;
  }

  listAdminApplications(filter?: { status?: CreatorVerificationStatus; creatorProfileId?: string; userId?: string }): CreatorVerificationApplication[] {
    return this.store.listApplications(filter);
  }

  getAdminApplicationDetail(applicationId: string): { application: CreatorVerificationApplication; audit: ReturnType<CreatorVerificationStore["listAuditEvents"]> } {
    const application = this.requireApplication(applicationId);
    return { application, audit: this.store.listAuditEvents(applicationId) };
  }

  getPublicBadgeForCreator(creatorProfileId: string): CreatorVerificationPublicBadge {
    const app = this.store.getLatestForCreator(creatorProfileId);
    return app ? getCreatorVerificationBadge(app.status, app.approvedAt) : { isVerified: false };
  }

  private requireApplication(applicationId: string): CreatorVerificationApplication {
    const app = this.store.getApplicationById(applicationId);
    if (!app) throw new Error("APPLICATION_NOT_FOUND");
    return app;
  }
}
