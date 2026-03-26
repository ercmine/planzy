import { randomUUID } from "node:crypto";

import { CreatorProfileStatus } from "../accounts/types.js";
import type { AccountsService } from "../accounts/service.js";
import { ValidationError } from "../plans/errors.js";
import { FEATURE_KEYS, type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import type { CreatorStore } from "../creator/store.js";
import type { CreatorMonetizationStore } from "./store.js";
import type { CreatorMembershipPlan, CreatorMonetizationCapabilitiesResponse, CreatorMonetizationProfile, MonetizationEligibilityResult, MonetizationReasonCode, MonetizationStatus, PremiumAccessDecision, TipIntent } from "./types.js";

export interface TipPaymentAdapter { name: string; createIntent(input: TipIntent): Promise<{ externalPaymentRef: string }>; }

export class CreatorMonetizationService {
  constructor(
    private readonly store: CreatorMonetizationStore,
    private readonly accounts: AccountsService,
    private readonly subscriptions: SubscriptionService,
    private readonly creatorStore: CreatorStore,
    private readonly accessEngine?: FeatureQuotaEngine,
    private readonly tipAdapter?: TipPaymentAdapter
  ) {}

  private ensureProfileForCreator(creatorProfileId: string): CreatorMonetizationProfile {
    const creatorProfile = this.creatorStore.getProfileById(creatorProfileId);
    if (!creatorProfile) throw new Error("CREATOR_NOT_FOUND");
    const existing = this.store.getProfile(creatorProfileId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const initial: CreatorMonetizationProfile = {
      id: `cmp_${randomUUID()}`,
      creatorProfileId,
      creatorUserId: creatorProfile.userId,
      monetizationStatus: "not_eligible",
      tippingEnabled: false,
      premiumContentEnabled: false,
      featuredPlacementEligible: false,
      featuredPlacementOptIn: false,
      monetizationVisibility: "hidden",
      futureSubscriptionsEnabledPlaceholder: false,
      payoutReadinessStatus: "not_started",
      complianceReadinessStatus: "not_started",
      monetizationCapabilities: {},
      restrictions: [],
      createdAt: now,
      updatedAt: now
    };
    this.store.saveProfile(initial);
    return initial;
  }

  getProfile(creatorProfileId: string): CreatorMonetizationProfile {
    return this.ensureProfileForCreator(creatorProfileId);
  }

  evaluateEligibility(creatorProfileId: string): MonetizationEligibilityResult {
    const creator = this.creatorStore.getProfileById(creatorProfileId);
    if (!creator) return { eligible: false, status: "not_eligible", reasonCode: "creator_profile_missing", adminExplanation: "Creator profile does not exist", userExplanation: "Create a creator profile first." };
    if (creator.status === CreatorProfileStatus.SUSPENDED) return { eligible: false, status: "suspended", reasonCode: "moderation_suspended", adminExplanation: "Creator profile suspended.", userExplanation: "Monetization is disabled while your account is suspended." };
    if (creator.status !== CreatorProfileStatus.ACTIVE) return { eligible: false, status: "pending_review", reasonCode: "creator_not_active", adminExplanation: "Creator is not active.", userExplanation: "Monetization review requires an active creator profile." };
    this.subscriptions.ensureAccount(creatorProfileId, SubscriptionTargetType.CREATOR);
    const ent = this.subscriptions.getCurrentEntitlements(creatorProfileId).values;
    if (!Boolean(ent.creator_monetization_tools)) return { eligible: false, status: "not_eligible", reasonCode: "missing_plan_entitlement", adminExplanation: "Creator plan lacks monetization entitlements.", userExplanation: "Upgrade your creator plan to enable monetization tools." };
    return { eligible: true, status: "eligible", adminExplanation: "Creator satisfies default monetization checks", userExplanation: "You can enable monetization features." };
  }

  getCapabilities(creatorProfileId: string): CreatorMonetizationCapabilitiesResponse {
    const profile = this.ensureProfileForCreator(creatorProfileId);
    const eligibility = this.evaluateEligibility(creatorProfileId);
    const ent = this.subscriptions.getCurrentEntitlements(creatorProfileId).values;
    const active = ["active", "eligible", "limited"].includes(profile.monetizationStatus) && eligibility.eligible;
    const caps = {
      canReceiveTips: active && Boolean(ent.creator_tips_enabled),
      canReceiveDryadTips: active && Boolean(ent.creator_tips_enabled),
      canClaimDryadRewards: active && Boolean(ent.creator_monetization_tools),
      canPublishPremiumContent: active && Boolean(ent.creator_premium_content_enabled),
      canBeFeatured: active && (profile.adminFeaturedOverride ?? (Boolean(ent.creator_featured_eligibility) && profile.featuredPlacementOptIn && profile.featuredPlacementEligible)),
      canAccessHigherUploadLimits: active && Boolean(ent.creator_extended_upload_limits),
      canOfferSubscriptionsFuture: active && Boolean(ent.creator_membership_hooks_enabled),
      canAccessCreatorAnalyticsPremium: active && Boolean(ent.creator_premium_analytics),
      canUploadExtendedVideo: active && Boolean(ent.creator_video_extended_limits),
      canCreatePremiumGuides: active && Boolean(ent.creator_premium_content_enabled)
    };
    return {
      status: profile.monetizationStatus,
      reasonCode: profile.statusReasonCode ?? eligibility.reasonCode,
      capabilities: caps,
      sourceEntitlements: ent
    };
  }

  updateSettings(actorUserId: string, creatorProfileId: string, patch: Partial<Pick<CreatorMonetizationProfile, "tippingEnabled" | "premiumContentEnabled" | "featuredPlacementOptIn" | "monetizationVisibility">>): CreatorMonetizationProfile {
    const creator = this.creatorStore.getProfileById(creatorProfileId);
    if (!creator) throw new Error("CREATOR_NOT_FOUND");
    if (creator.userId !== actorUserId) throw new Error("FORBIDDEN");
    const profile = this.ensureProfileForCreator(creatorProfileId);
    const capabilities = this.getCapabilities(creatorProfileId).capabilities;
    if (patch.tippingEnabled && !capabilities.canReceiveTips) throw new Error("CREATOR_TIPPING_NOT_ELIGIBLE");
    if (patch.premiumContentEnabled && !capabilities.canPublishPremiumContent) throw new Error("CREATOR_PREMIUM_NOT_ELIGIBLE");

    const updated: CreatorMonetizationProfile = { ...profile, ...patch, updatedAt: new Date().toISOString() };
    this.store.saveProfile(updated);
    return updated;
  }

  adminUpdateStatus(adminUserId: string, creatorProfileId: string, input: { status: MonetizationStatus; reasonCode?: MonetizationReasonCode; restrictions?: string[]; featuredOverride?: boolean }): CreatorMonetizationProfile {
    const profile = this.ensureProfileForCreator(creatorProfileId);
    const updated: CreatorMonetizationProfile = {
      ...profile,
      monetizationStatus: input.status,
      statusReasonCode: input.reasonCode,
      restrictions: input.restrictions ?? profile.restrictions,
      adminFeaturedOverride: input.featuredOverride,
      updatedAt: new Date().toISOString()
    };
    this.store.saveProfile(updated);
    this.store.addAuditLog({ id: `mal_${randomUUID()}`, creatorProfileId, actorUserId: adminUserId, action: "status_update", reason: input.reasonCode, metadata: { status: input.status, restrictions: updated.restrictions }, createdAt: new Date().toISOString() });
    return updated;
  }

  async createTipIntent(senderUserId: string, input: { creatorProfileId: string; amountMinor: number; currency?: string; note?: string; relatedContentId?: string; relatedContentType?: "guide" | "review" | "video" }): Promise<TipIntent> {
    if (input.amountMinor < 100 || input.amountMinor > 250000) throw new ValidationError(["tip amount must be within configured range"]);
    if (input.note && input.note.length > 300) throw new ValidationError(["tip note too long"]);
    const creator = this.creatorStore.getProfileById(input.creatorProfileId);
    if (!creator) throw new Error("CREATOR_NOT_FOUND");
    const cap = this.getCapabilities(input.creatorProfileId).capabilities;
    if (!cap.canReceiveTips) throw new Error("CREATOR_TIPPING_NOT_ELIGIBLE");
    const now = new Date().toISOString();
    const platformFeeMinor = Math.floor(input.amountMinor * 0.1);
    const intent: TipIntent = {
      id: `tip_${randomUUID()}`,
      senderUserId,
      creatorUserId: creator.userId,
      creatorProfileId: input.creatorProfileId,
      amountMinor: input.amountMinor,
      currency: (input.currency ?? "USD").toUpperCase(),
      note: input.note?.trim(),
      relatedContentId: input.relatedContentId,
      relatedContentType: input.relatedContentType,
      platformFeeMinor,
      creatorAmountMinor: input.amountMinor - platformFeeMinor,
      status: "intent_created",
      paymentProvider: this.tipAdapter?.name ?? "internal_adapter_pending",
      createdAt: now,
      updatedAt: now
    };
    if (this.tipAdapter) {
      const providerIntent = await this.tipAdapter.createIntent(intent);
      intent.externalPaymentRef = providerIntent.externalPaymentRef;
      intent.status = "pending";
    }
    this.store.createTipIntent(intent);
    return intent;
  }

  listTipSummary(creatorProfileId: string): { totalCount: number; grossAmountMinor: number } {
    const tips = this.store.listTipsByCreator(creatorProfileId);
    return { totalCount: tips.length, grossAmountMinor: tips.filter((t) => ["pending", "succeeded", "intent_created"].includes(t.status)).reduce((sum, row) => sum + row.amountMinor, 0) };
  }

  setGuidePremiumMode(actorUserId: string, creatorProfileId: string, guideId: string, input: { mode: "free" | "premium" | "elite" | "membership"; previewSummary?: string }): void {
    const creator = this.creatorStore.getProfileById(creatorProfileId);
    if (!creator || creator.userId !== actorUserId) throw new Error("FORBIDDEN");
    const guide = this.creatorStore.getGuideById(guideId);
    if (!guide || guide.creatorProfileId !== creatorProfileId) throw new Error("GUIDE_NOT_FOUND");
    if (input.mode !== "free" && !this.getCapabilities(creatorProfileId).capabilities.canPublishPremiumContent) throw new Error("CREATOR_PREMIUM_NOT_ELIGIBLE");
    guide.monetization = {
      mode: input.mode,
      access: input.mode === "free" ? "public" : (input.mode === "elite" ? "elite" : (input.mode === "premium" ? "premium" : "membership")),
      previewSummary: input.previewSummary,
      lockedReasonCode: input.mode === "free" ? undefined : "premium_access_required",
      gatingSource: input.mode === "membership" ? "creator_membership" : (input.mode === "premium" || input.mode === "elite" ? "creator_plan" : undefined),
      minimumPlanRequired: input.mode === "elite" ? "elite" : input.mode === "premium" ? "plus" : "free"
    };
    guide.updatedAt = new Date().toISOString();
    this.creatorStore.updateGuide(guide);
  }

  evaluateGuideAccess(viewerUserId: string | undefined, creatorProfileId: string, guideId: string): PremiumAccessDecision {
    const guide = this.creatorStore.getGuideById(guideId);
    if (!guide || guide.creatorProfileId !== creatorProfileId || !guide.monetization || guide.monetization.mode === "free") return { locked: false };
    const owner = this.creatorStore.getProfileById(creatorProfileId);
    if (viewerUserId && owner?.userId === viewerUserId) return { locked: false };
    if (!viewerUserId) return { locked: true, reasonCode: "viewer_entitlement_missing", previewSummary: guide.monetization.previewSummary ?? guide.summary };

    this.subscriptions.ensureAccount(viewerUserId, SubscriptionTargetType.USER);
    const subscription = this.subscriptions.getSubscription(viewerUserId);
    const entitlements = this.subscriptions.getCurrentEntitlements(viewerUserId).values;
    const isPremium = !Boolean(entitlements.ads_enabled);
    const isElite = subscription.planId.includes("elite") || subscription.planId.includes("pro");

    if (guide.monetization.mode === "elite" && !isElite) {
      return { locked: true, reasonCode: "viewer_entitlement_missing", previewSummary: guide.monetization.previewSummary ?? guide.summary };
    }
    if ((guide.monetization.mode === "premium" || guide.monetization.mode === "membership") && !isPremium) {
      return { locked: true, reasonCode: "viewer_entitlement_missing", previewSummary: guide.monetization.previewSummary ?? guide.summary };
    }
    return { locked: false };
  }

  createMembershipPlan(actorUserId: string, creatorProfileId: string, input: { code: string; tierName: string; monthlyPriceMinor: number; currency?: string; perks?: string[] }): CreatorMembershipPlan {
    const creator = this.creatorStore.getProfileById(creatorProfileId);
    if (!creator || creator.userId !== actorUserId) throw new Error("FORBIDDEN");
    if (!this.getCapabilities(creatorProfileId).capabilities.canOfferSubscriptionsFuture) throw new Error("CREATOR_MEMBERSHIP_NOT_ELIGIBLE");
    const now = new Date().toISOString();
    const plan: CreatorMembershipPlan = { id: `cmp_plan_${randomUUID()}`, creatorProfileId, code: input.code, status: "draft", monthlyPriceMinor: input.monthlyPriceMinor, currency: (input.currency ?? "USD").toUpperCase(), tierName: input.tierName, perks: input.perks ?? [], createdAt: now, updatedAt: now };
    this.store.createMembershipPlan(plan);
    return plan;
  }

  listAuditLogs(creatorProfileId: string) { return this.store.listAuditLogs(creatorProfileId); }
}
