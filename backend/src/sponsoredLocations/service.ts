import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import type { CampaignBudget, EligibilityDecision, FraudFlag, LedgerEntry, PlaceOwnerAccess, QualifyingAction, RewardClaim, SponsoredCampaign, SponsoredLocationStore, SponsoredRewardRule, VisitSession } from "./types.js";

const PERBUG_DECIMALS = 6;

function nowIso(): string { return new Date().toISOString(); }
function atomic(amount: number): bigint { return BigInt(Math.round(amount * (10 ** PERBUG_DECIMALS))); }
function clamp(n: number, min: number, max: number): number { return Math.max(min, Math.min(max, n)); }

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class SponsoredLocationsService {
  constructor(
    private readonly store: SponsoredLocationStore,
    private readonly options: {
      platformFeeBps?: number;
      placeCoordinates?: (placeId: string) => { lat: number; lng: number } | null;
      onUserRewardPaid?: (input: { userId: string; amountAtomic: bigint; campaignId: string; claimId: string }) => Promise<void>;
    } = {}
  ) {}

  requestPlaceAccess(input: { placeId: string; businessId: string; userId: string; role?: "owner" | "manager" }): PlaceOwnerAccess {
    const access: PlaceOwnerAccess = {
      id: `pa_${randomUUID()}`,
      placeId: input.placeId,
      businessId: input.businessId,
      userId: input.userId,
      role: input.role ?? "owner",
      status: "pending",
      createdAt: nowIso()
    };
    this.store.savePlaceAccess(access);
    return structuredClone(access);
  }

  approvePlaceAccess(input: { accessId: string; adminUserId: string }): PlaceOwnerAccess {
    const access = this.store.getPlaceAccess(input.accessId);
    if (!access) throw new ValidationError(["place access request not found"]);
    access.status = "approved";
    access.approvedAt = nowIso();
    access.reviewedBy = input.adminUserId;
    this.store.savePlaceAccess(access);
    return structuredClone(access);
  }

  createCampaign(input: {
    businessId: string;
    createdBy: string;
    placeId: string;
    title: string;
    callToAction?: string;
    categoryTags?: string[];
    placements: SponsoredCampaign["placements"];
    targetRadiusMeters?: number;
    startsAt: string;
    endsAt: string;
    dailyBudgetPerbug: number;
    totalBudgetPerbug: number;
    rewardRule: {
      type?: SponsoredRewardRule["type"];
      payoutPerVisitPerbug: number;
      decayBps?: number;
      firstXDaily?: number;
      splitWindowDays?: number;
      cooldownHours?: number;
      dwellSeconds?: number;
      requiredActions?: QualifyingAction[];
      oneRewardPerDay?: boolean;
    };
  }): { campaign: SponsoredCampaign; rewardRule: SponsoredRewardRule; budget: CampaignBudget } {
    if (new Date(input.endsAt) <= new Date(input.startsAt)) throw new ValidationError(["campaign end must be after start"]);
    if (input.totalBudgetPerbug <= 0 || input.dailyBudgetPerbug <= 0) throw new ValidationError(["budgets must be positive"]);

    const campaign: SponsoredCampaign = {
      id: `camp_${randomUUID()}`,
      placeId: input.placeId,
      businessId: input.businessId,
      title: input.title,
      callToAction: input.callToAction,
      categoryTags: input.categoryTags ?? [],
      placements: input.placements,
      targetRadiusMeters: input.targetRadiusMeters ?? 250,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      dailyBudgetAtomic: atomic(input.dailyBudgetPerbug),
      totalBudgetAtomic: atomic(input.totalBudgetPerbug),
      status: "draft",
      createdBy: input.createdBy,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    const rewardRule: SponsoredRewardRule = {
      campaignId: campaign.id,
      type: input.rewardRule.type ?? "fixed_per_visit",
      payoutAtomic: atomic(input.rewardRule.payoutPerVisitPerbug),
      decayBps: input.rewardRule.decayBps,
      firstXDaily: input.rewardRule.firstXDaily,
      splitWindowDays: input.rewardRule.splitWindowDays,
      cooldownHours: input.rewardRule.cooldownHours ?? 24,
      dwellSeconds: input.rewardRule.dwellSeconds ?? 180,
      requiredActions: input.rewardRule.requiredActions ?? ["check_in", "dwell"],
      oneRewardPerDay: input.rewardRule.oneRewardPerDay ?? true
    };
    const budget: CampaignBudget = {
      campaignId: campaign.id,
      fundedAtomic: 0n,
      platformFeeAtomic: 0n,
      rewardPoolAtomic: 0n,
      reservedAtomic: 0n,
      paidAtomic: 0n,
      refundedAtomic: 0n,
      updatedAt: nowIso()
    };
    this.store.saveCampaign(campaign);
    this.store.saveRewardRule(rewardRule);
    this.store.saveBudget(budget);
    return { campaign: structuredClone(campaign), rewardRule: structuredClone(rewardRule), budget: structuredClone(budget) };
  }

  fundCampaign(input: { campaignId: string; businessId: string; amountPerbug: number }): CampaignBudget {
    if (input.amountPerbug <= 0) throw new ValidationError(["funding amount must be positive"]);
    const campaign = this.requireCampaign(input.campaignId);
    if (campaign.businessId !== input.businessId) throw new ValidationError(["campaign not owned by business"]);
    if (!["draft", "active", "paused"].includes(campaign.status)) throw new ValidationError(["campaign cannot be funded in current status"]);
    const budget = this.requireBudget(campaign.id);
    const amountAtomic = atomic(input.amountPerbug);
    const feeBps = clamp(this.options.platformFeeBps ?? Number.parseInt(process.env.SPONSORED_PLATFORM_FEE_BPS ?? "1000", 10), 0, 5000);
    const feeAtomic = (amountAtomic * BigInt(feeBps)) / 10_000n;
    const rewardPoolAtomic = amountAtomic - feeAtomic;

    budget.fundedAtomic += amountAtomic;
    budget.platformFeeAtomic += feeAtomic;
    budget.rewardPoolAtomic += rewardPoolAtomic;
    budget.updatedAt = nowIso();
    this.store.saveBudget(budget);

    if (campaign.status === "draft") {
      campaign.status = "active";
      campaign.updatedAt = nowIso();
      this.store.saveCampaign(campaign);
    }

    this.addLedger({ campaign, type: "funding", amountAtomic, metadata: { amountPerbug: input.amountPerbug } });
    if (feeAtomic > 0n) this.addLedger({ campaign, type: "platform_fee", amountAtomic: feeAtomic, metadata: { feeBps } });
    return structuredClone(budget);
  }

  getSponsoredPlacements(input: { lat: number; lng: number; surface: SponsoredCampaign["placements"][number] }) {
    const now = Date.now();
    return this.store
      .listActiveCampaigns()
      .filter((campaign) => campaign.placements.includes(input.surface))
      .filter((campaign) => Date.parse(campaign.startsAt) <= now && Date.parse(campaign.endsAt) >= now)
      .map((campaign) => {
        const budget = this.requireBudget(campaign.id);
        return {
          campaign,
          badge: "Sponsored",
          rewardEnabled: budget.rewardPoolAtomic - budget.reservedAtomic - budget.paidAtomic > 0n,
          estimatedRewardPerbug: Number(this.requireRule(campaign.id).payoutAtomic) / (10 ** PERBUG_DECIMALS),
          poolRemainingAtomic: budget.rewardPoolAtomic - budget.reservedAtomic - budget.paidAtomic
        };
      });
  }

  startVisitSession(input: { userId: string; campaignId: string; lat: number; lng: number }): VisitSession {
    const campaign = this.requireCampaign(input.campaignId);
    if (campaign.status !== "active") throw new ValidationError(["campaign not active"]);
    const budget = this.requireBudget(campaign.id);
    if (budget.rewardPoolAtomic - budget.reservedAtomic - budget.paidAtomic <= 0n) {
      campaign.status = "exhausted";
      this.store.saveCampaign(campaign);
      throw new ValidationError(["reward pool exhausted"]);
    }
    const session: VisitSession = {
      id: `visit_${randomUUID()}`,
      userId: input.userId,
      campaignId: campaign.id,
      placeId: campaign.placeId,
      startedAt: nowIso(),
      status: "started",
      startLat: input.lat,
      startLng: input.lng,
      latestLat: input.lat,
      latestLng: input.lng,
      samples: 1,
      dwellSeconds: 0,
      riskScore: 0,
      riskReasons: []
    };
    this.store.saveVisitSession(session);
    return structuredClone(session);
  }

  heartbeatVisit(input: { visitSessionId: string; lat: number; lng: number; elapsedSeconds: number }): VisitSession {
    const session = this.requireVisit(input.visitSessionId);
    session.latestLat = input.lat;
    session.latestLng = input.lng;
    session.samples += 1;
    session.dwellSeconds = Math.max(session.dwellSeconds, input.elapsedSeconds);
    if (distanceMeters(session.startLat, session.startLng, input.lat, input.lng) > 250) {
      session.riskScore += 15;
      session.riskReasons.push("large_mid_visit_jump");
    }
    this.store.saveVisitSession(session);
    return structuredClone(session);
  }

  verifyVisit(input: { visitSessionId: string; actions: QualifyingAction[]; deviceId?: string; ipHash?: string }) {
    const session = this.requireVisit(input.visitSessionId);
    const campaign = this.requireCampaign(session.campaignId);
    const rule = this.requireRule(campaign.id);

    const reasons: string[] = [];
    const placeCoordinate = this.options.placeCoordinates?.(campaign.placeId);
    if (placeCoordinate) {
      const meterDistance = distanceMeters(session.latestLat, session.latestLng, placeCoordinate.lat, placeCoordinate.lng);
      if (meterDistance > campaign.targetRadiusMeters) reasons.push("outside_geofence");
    }
    if (session.dwellSeconds < rule.dwellSeconds) reasons.push("insufficient_dwell_time");
    for (const action of rule.requiredActions) {
      if (!input.actions.includes(action)) reasons.push(`missing_action_${action}`);
    }

    const userClaims = this.store.listClaimsByUser(session.userId).filter((claim) => claim.placeId === campaign.placeId && claim.status === "paid");
    if (rule.oneRewardPerDay && userClaims.some((claim) => claim.paidAt && claim.paidAt.slice(0, 10) === nowIso().slice(0, 10))) {
      reasons.push("daily_limit_reached");
    }

    const recentVisit = this.store
      .listVisitSessionsByUser(session.userId)
      .filter((visit) => visit.placeId === campaign.placeId && visit.id !== session.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];

    if (recentVisit) {
      const hoursSince = (Date.now() - Date.parse(recentVisit.startedAt)) / 3_600_000;
      if (hoursSince < rule.cooldownHours) reasons.push("cooldown_active");
      if (distanceMeters(recentVisit.latestLat, recentVisit.latestLng, session.latestLat, session.latestLng) > 50_000 && hoursSince < 2) {
        reasons.push("impossible_travel");
      }
    }

    if (session.riskScore >= 35) reasons.push("risk_score_exceeded");

    const payoutAtomic = this.calculatePayout(campaign, rule);
    const decision: EligibilityDecision = {
      id: `decision_${randomUUID()}`,
      visitSessionId: session.id,
      eligible: reasons.length === 0,
      rejectionReasons: reasons,
      payoutAtomic: reasons.length === 0 ? payoutAtomic : 0n,
      decidedAt: nowIso()
    };
    this.store.saveDecision(decision);
    session.status = reasons.length === 0 ? "verified" : "ineligible";
    session.endedAt = nowIso();
    this.store.saveVisitSession(session);

    if (reasons.length > 0) this.flagFraud({ campaignId: campaign.id, placeId: campaign.placeId, userId: session.userId, visitSessionId: session.id, reason: reasons.join(","), severity: reasons.includes("impossible_travel") ? "high" : "medium" });

    return structuredClone(decision);
  }

  async claimReward(input: { visitSessionId: string; userId: string }): Promise<RewardClaim> {
    const session = this.requireVisit(input.visitSessionId);
    if (session.userId !== input.userId) throw new ValidationError(["visit does not belong to user"]);
    const existing = this.store.getClaimByVisit(session.id);
    if (existing) return structuredClone(existing);
    const decision = this.store.getDecisionByVisit(session.id);
    if (!decision || !decision.eligible) throw new ValidationError(["visit is not eligible for reward"]);

    const campaign = this.requireCampaign(session.campaignId);
    const budget = this.requireBudget(campaign.id);
    const remaining = budget.rewardPoolAtomic - budget.reservedAtomic - budget.paidAtomic;
    if (decision.payoutAtomic > remaining) {
      campaign.status = "exhausted";
      this.store.saveCampaign(campaign);
      throw new ValidationError(["campaign reward pool exhausted"]);
    }

    const claim: RewardClaim = {
      id: `sclaim_${randomUUID()}`,
      campaignId: campaign.id,
      placeId: campaign.placeId,
      userId: input.userId,
      visitSessionId: session.id,
      decisionId: decision.id,
      payoutAtomic: decision.payoutAtomic,
      status: session.riskScore >= 25 ? "manual_review" : "reserved",
      createdAt: nowIso()
    };

    budget.reservedAtomic += claim.payoutAtomic;
    budget.updatedAt = nowIso();
    this.store.saveBudget(budget);
    this.store.saveClaim(claim);
    this.addLedger({ campaign, userId: input.userId, type: "reward_reserve", amountAtomic: claim.payoutAtomic, metadata: { visitSessionId: session.id, claimId: claim.id } });

    if (claim.status === "manual_review") {
      this.flagFraud({ campaignId: campaign.id, placeId: campaign.placeId, userId: input.userId, visitSessionId: session.id, reason: "manual_review_required", severity: "medium" });
      return structuredClone(claim);
    }

    claim.status = "paid";
    claim.paidAt = nowIso();
    budget.reservedAtomic -= claim.payoutAtomic;
    budget.paidAtomic += claim.payoutAtomic;
    budget.updatedAt = nowIso();
    this.store.saveBudget(budget);
    this.store.saveClaim(claim);
    this.addLedger({ campaign, userId: input.userId, type: "reward_payout", amountAtomic: claim.payoutAtomic, metadata: { claimId: claim.id } });
    await this.options.onUserRewardPaid?.({ userId: input.userId, amountAtomic: claim.payoutAtomic, campaignId: campaign.id, claimId: claim.id });

    if (budget.rewardPoolAtomic - budget.paidAtomic <= 0n) {
      campaign.status = "exhausted";
      campaign.updatedAt = nowIso();
      this.store.saveCampaign(campaign);
    }

    return structuredClone(claim);
  }

  adminModerateClaim(input: { claimId: string; action: "approve" | "reject"; adminUserId: string; reason?: string }): RewardClaim {
    const claim = this.store.getClaim(input.claimId);
    if (!claim) throw new ValidationError(["claim not found"]);
    const campaign = this.requireCampaign(claim.campaignId);
    const budget = this.requireBudget(campaign.id);
    if (claim.status !== "manual_review") return structuredClone(claim);

    if (input.action === "approve") {
      claim.status = "paid";
      claim.paidAt = nowIso();
      budget.reservedAtomic -= claim.payoutAtomic;
      budget.paidAtomic += claim.payoutAtomic;
      this.addLedger({ campaign, userId: claim.userId, type: "reward_payout", amountAtomic: claim.payoutAtomic, metadata: { claimId: claim.id, approvedBy: input.adminUserId } });
    } else {
      claim.status = "rejected";
      budget.reservedAtomic -= claim.payoutAtomic;
      this.addLedger({ campaign, userId: claim.userId, type: "reward_release", amountAtomic: claim.payoutAtomic, metadata: { claimId: claim.id, reason: input.reason ?? "rejected_by_admin" } });
    }
    budget.updatedAt = nowIso();
    this.store.saveBudget(budget);
    this.store.saveClaim(claim);
    return structuredClone(claim);
  }

  setCampaignStatus(input: { campaignId: string; businessId?: string; status: SponsoredCampaign["status"]; adminOverride?: boolean }) {
    const campaign = this.requireCampaign(input.campaignId);
    if (!input.adminOverride && input.businessId && campaign.businessId !== input.businessId) throw new ValidationError(["campaign ownership mismatch"]);
    campaign.status = input.status;
    campaign.updatedAt = nowIso();
    this.store.saveCampaign(campaign);
    return structuredClone(campaign);
  }

  issueRefund(input: { campaignId: string; adminUserId: string; reason?: string }) {
    const campaign = this.requireCampaign(input.campaignId);
    const budget = this.requireBudget(campaign.id);
    const refundable = budget.rewardPoolAtomic - budget.paidAtomic - budget.reservedAtomic;
    if (refundable <= 0n) throw new ValidationError(["no refundable balance"]);
    budget.refundedAtomic += refundable;
    budget.rewardPoolAtomic -= refundable;
    budget.updatedAt = nowIso();
    campaign.status = "ended";
    campaign.updatedAt = nowIso();
    this.store.saveBudget(budget);
    this.store.saveCampaign(campaign);
    this.addLedger({ campaign, type: "refund", amountAtomic: refundable, metadata: { adminUserId: input.adminUserId, reason: input.reason ?? "unused_pool_refund" } });
    return { campaign: structuredClone(campaign), budget: structuredClone(budget), refundedAtomic: refundable };
  }

  listBusinessCampaigns(businessId: string) { return this.store.listCampaignsByBusiness(businessId).map((campaign) => ({ campaign, budget: this.requireBudget(campaign.id), rule: this.requireRule(campaign.id), claims: this.store.listClaimsByCampaign(campaign.id) })); }
  listUserRewardHistory(userId: string) { return this.store.listClaimsByUser(userId); }
  listFraudFlags() { return this.store.listFraudFlags(); }
  listCampaignLedger(campaignId: string) { return this.store.listLedgerForCampaign(campaignId); }

  private requireCampaign(campaignId: string): SponsoredCampaign {
    const campaign = this.store.getCampaign(campaignId);
    if (!campaign) throw new ValidationError(["campaign not found"]);
    return campaign;
  }

  private requireBudget(campaignId: string): CampaignBudget {
    const budget = this.store.getBudget(campaignId);
    if (!budget) throw new ValidationError(["campaign budget not found"]);
    return budget;
  }

  private requireRule(campaignId: string): SponsoredRewardRule {
    const rule = this.store.getRewardRule(campaignId);
    if (!rule) throw new ValidationError(["campaign reward rule not found"]);
    return rule;
  }

  private requireVisit(visitSessionId: string): VisitSession {
    const visit = this.store.getVisitSession(visitSessionId);
    if (!visit) throw new ValidationError(["visit session not found"]);
    return visit;
  }

  private calculatePayout(campaign: SponsoredCampaign, rule: SponsoredRewardRule): bigint {
    if (rule.type === "decay_per_claim") {
      const paidCount = this.store.listClaimsByCampaign(campaign.id).filter((claim) => claim.status === "paid").length;
      const decayBps = BigInt(clamp(rule.decayBps ?? 0, 0, 9000));
      return (rule.payoutAtomic * (10_000n - decayBps * BigInt(paidCount))) / 10_000n;
    }
    if (rule.type === "first_x_daily") {
      const paidToday = this.store.listClaimsByCampaign(campaign.id).filter((claim) => claim.paidAt?.slice(0, 10) === nowIso().slice(0, 10) && claim.status === "paid").length;
      if ((rule.firstXDaily ?? 0) > 0 && paidToday >= (rule.firstXDaily ?? 0)) return 0n;
    }
    return rule.payoutAtomic;
  }

  private flagFraud(input: Omit<FraudFlag, "id" | "createdAt">): void {
    this.store.addFraudFlag({ id: `ff_${randomUUID()}`, createdAt: nowIso(), ...input });
  }

  private addLedger(input: { campaign: SponsoredCampaign; userId?: string; type: LedgerEntry["type"]; amountAtomic: bigint; metadata: Record<string, unknown> }): void {
    this.store.addLedgerEntry({ id: `led_${randomUUID()}`, campaignId: input.campaign.id, placeId: input.campaign.placeId, businessId: input.campaign.businessId, userId: input.userId, type: input.type, amountAtomic: input.amountAtomic, metadata: input.metadata, createdAt: nowIso() });
  }
}
