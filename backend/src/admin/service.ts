import { randomUUID } from "node:crypto";

import type { AccountsService } from "../accounts/service.js";
import { CreatorProfileStatus, UserRole, UserStatus, VerificationStatus } from "../accounts/types.js";
import type { CreatorVerificationService } from "../creatorVerification/service.js";
import type { ModerationService } from "../moderation/service.js";
import type { ModerationDecisionType, ModerationTargetRef } from "../moderation/types.js";
import { PlaceDataQualityService, createPlaceDataQualityConfigFromEnv, type PlaceDataQualityIssueStatus } from "../places/dataQuality.js";
import { PlaceMaintenanceService } from "../places/maintenance.js";
import type { PlaceNormalizationService } from "../places/service.js";
import type { PlaceStatus } from "../places/types.js";
import type { ReviewsStore } from "../reviews/store.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionStatus } from "../subscriptions/types.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";
import type { AdminActionAudit } from "./types.js";

export interface AdminServiceDeps {
  accountsService: AccountsService;
  moderationService: ModerationService;
  creatorVerificationService?: CreatorVerificationService;
  venueClaimsService?: VenueClaimsService;
  placeService?: PlaceNormalizationService;
  subscriptionService?: SubscriptionService;
  reviewsStore?: ReviewsStore;
}

export class AdminService {
  private readonly audit: AdminActionAudit[] = [];
  private readonly qualityService = new PlaceDataQualityService(createPlaceDataQualityConfigFromEnv());
  private readonly maintenanceService: PlaceMaintenanceService | undefined;

  constructor(private readonly deps: AdminServiceDeps) {
    this.maintenanceService = this.deps.placeService
      ? new PlaceMaintenanceService(this.deps.placeService.store)
      : undefined;
  }

  getRolesForUser(userId: string) {
    return this.deps.accountsService.getIdentitySummary(userId).roles;
  }

  getOverview() {
    const users = this.deps.accountsService.listUsers();
    const creators = this.deps.accountsService.listCreatorProfiles();
    const businesses = this.deps.accountsService.listBusinessProfiles();
    const moderationQueue = this.deps.moderationService.listQueue({ limit: 500 });
    const openReports = moderationQueue.reduce((sum, item) => sum + item.unresolvedReports, 0);
    const urgentReports = moderationQueue.filter((row) => ["high", "critical"].includes(row.severity)).length;
    const pendingCreatorVerifications = this.deps.creatorVerificationService?.listAdminApplications({ status: "submitted" }).length ?? 0;
    const pendingBusinessClaims = this.deps.venueClaimsService
      ? this.deps.venueClaimsService.listLeads({ statuses: ["submitted", "under_review", "pending_verification"] }, { isAdmin: true, userId: "system" })
      : Promise.resolve({ total: 0 });
    return Promise.resolve(pendingBusinessClaims).then((claims) => {
      const sourceHealth = this.getSourceHealth();
      const placeQuality = this.getPlaceQualityOverview();
      const subscriptionOps = this.getSubscriptionOps();
      const adsOps = this.getAdsOps();
      return {
        users: {
          total: users.length,
          suspended: users.filter((user) => user.status === UserStatus.SUSPENDED).length,
          flagged: users.filter((user) => user.moderationFlags.length > 0).length
        },
        creators: {
          total: creators.length,
          pendingVerification: pendingCreatorVerifications,
          restricted: creators.filter((row) => [CreatorProfileStatus.HIDDEN, CreatorProfileStatus.SUSPENDED].includes(row.status)).length
        },
        businesses: {
          total: businesses.length,
          verified: businesses.filter((row) => row.verificationStatus === VerificationStatus.VERIFIED).length,
          pendingClaims: "claims" in claims ? claims.claims.length : claims.total
        },
        moderation: {
          queueItems: moderationQueue.length,
          openReports,
          urgentReports
        },
        sourceHealth,
        placeQuality,
        subscriptions: subscriptionOps.summary,
        ads: adsOps.summary,
        recentAdminActions: this.audit.slice(-20).reverse()
      };
    });
  }

  listUsers(query: { search?: string; status?: UserStatus; role?: UserRole; limit?: number; offset?: number }) {
    const all = this.deps.accountsService.listUsers();
    const filtered = all.filter((user) => {
      if (query.status && user.status !== query.status) return false;
      if (query.search && !`${user.id} ${user.email ?? ""}`.toLowerCase().includes(query.search.toLowerCase())) return false;
      if (query.role) {
        const roles = this.deps.accountsService.getIdentitySummary(user.id).roles;
        if (!roles.includes(query.role)) return false;
      }
      return true;
    });
    const offset = Math.max(0, query.offset ?? 0);
    const limit = Math.max(1, Math.min(query.limit ?? 50, 200));
    return { total: filtered.length, items: filtered.slice(offset, offset + limit) };
  }

  getSubscriptionOps() {
    if (!this.deps.subscriptionService) return { summary: { total: 0, active: 0, trialing: 0, grace: 0, mismatches: 0 }, items: [] };
    const subs = this.deps.subscriptionService.listSubscriptions();
    const items = subs.map((sub) => {
      const entitlements = this.deps.subscriptionService!.getCurrentEntitlements(sub.targetId).values;
      const mismatch = (sub.status === SubscriptionStatus.FREE && entitlements.ads_enabled === false) || (sub.status !== SubscriptionStatus.FREE && entitlements.ads_enabled === true && sub.planId !== "free");
      return { subscription: sub, entitlementsMismatch: mismatch, adsEnabled: entitlements.ads_enabled };
    });
    return {
      summary: {
        total: subs.length,
        active: subs.filter((row) => row.status === SubscriptionStatus.ACTIVE).length,
        trialing: subs.filter((row) => row.status === SubscriptionStatus.TRIALING).length,
        grace: subs.filter((row) => row.status === SubscriptionStatus.GRACE_PERIOD).length,
        mismatches: items.filter((row) => row.entitlementsMismatch).length
      },
      items
    };
  }

  getAdsOps() {
    const subscriptionOps = this.getSubscriptionOps();
    const adEnabled = subscriptionOps.items.filter((row) => row.adsEnabled === true).length;
    const adFree = subscriptionOps.items.filter((row) => row.adsEnabled === false).length;
    return {
      summary: {
        adEnabledAudience: adEnabled,
        adFreeAudience: adFree,
        entitlementMismatches: subscriptionOps.summary.mismatches
      },
      items: subscriptionOps.items
    };
  }

  getSourceHealth() {
    if (!this.deps.placeService) return { providers: [], staleSources: 0, mergeAnomalies: 0, lowConfidenceMappings: 0 };
    const records = this.deps.placeService.listSourceRecords();
    const now = Date.now();
    const byProvider = new Map<string, { provider: string; total: number; stale: number; lastSyncAt?: string }>();
    for (const record of records) {
      const stale = (now - new Date(record.fetchTimestamp).getTime()) > 1000 * 60 * 60 * 24 * 7;
      const current = byProvider.get(record.provider) ?? { provider: record.provider, total: 0, stale: 0, lastSyncAt: undefined };
      current.total += 1;
      if (stale) current.stale += 1;
      if (!current.lastSyncAt || record.fetchTimestamp > current.lastSyncAt) current.lastSyncAt = record.fetchTimestamp;
      byProvider.set(record.provider, current);
    }
    const places = this.deps.placeService.listCanonicalPlaces();
    return {
      providers: [...byProvider.values()],
      staleSources: records.filter((record) => (now - new Date(record.fetchTimestamp).getTime()) > 1000 * 60 * 60 * 24 * 7).length,
      mergeAnomalies: places.filter((place) => place.mergeConfidence < 0.5).length,
      lowConfidenceMappings: places.filter((place) => place.categoryConfidence < 0.5).length,
      missingMedia: places.filter((place) => place.photoGallery.length === 0).length,
      missingDescriptions: places.filter((place) => !place.shortDescription && !place.longDescription).length
    };
  }


  refreshPlaceQualityIssues() {
    const places = this.deps.placeService?.listCanonicalPlaces() ?? [];
    const sourceRecords = this.deps.placeService?.listSourceRecords() ?? [];
    return this.qualityService.evaluate(places, sourceRecords);
  }

  getPlaceQualityOverview() {
    this.refreshPlaceQualityIssues();
    return this.qualityService.summarize();
  }

  listPlaceQualityIssues(filter: { issueType?: string; severity?: string; status?: string; provider?: string; city?: string; category?: string; placeId?: string; page?: number; pageSize?: number }) {
    this.refreshPlaceQualityIssues();
    return this.qualityService.listIssues({
      issueType: filter.issueType as never,
      severity: filter.severity as never,
      status: filter.status as never,
      provider: filter.provider,
      city: filter.city,
      category: filter.category,
      placeId: filter.placeId
    }, filter.page ?? 0, filter.pageSize ?? 50);
  }

  getPlaceQualityIssue(issueId: string) {
    this.refreshPlaceQualityIssues();
    return this.qualityService.getIssue(issueId);
  }

  getPlaceQualitySummary(placeId: string) {
    this.refreshPlaceQualityIssues();
    return this.qualityService.getPlaceSummary(placeId);
  }

  getProviderQualitySummary() {
    this.refreshPlaceQualityIssues();
    return this.qualityService.getProviderSummary();
  }

  updatePlaceQualityIssueStatus(input: { actorUserId: string; issueId: string; status: PlaceDataQualityIssueStatus; note?: string }) {
    this.refreshPlaceQualityIssues();
    const change = this.qualityService.updateIssueStatus(input.issueId, input.status, input.actorUserId, input.note);
    if (!change) return undefined;
    this.recordAudit({
      actorUserId: input.actorUserId,
      actionType: `place_quality.${input.status}`,
      targetType: "place_quality_issue",
      targetId: input.issueId,
      reason: "admin_status_transition",
      note: input.note,
      before: change.before as never,
      after: change.after as never
    });
    return change.after;
  }

  async listBusinessClaims(filter: { status?: string; limit?: number }) {
    if (!this.deps.venueClaimsService) return { total: 0, items: [] };
    return this.deps.venueClaimsService.listLeads({ statuses: filter.status ? [filter.status as never] : undefined, limit: filter.limit ?? 50 }, { isAdmin: true, userId: "admin" });
  }


  importProviderPlaceForQuality(input: { provider: string; rawPayload: unknown; sourceUrl?: string; fetchedAt?: string; importBatchId?: string; syncRunId?: string }) {
    if (!this.deps.placeService) return undefined;
    const result = this.deps.placeService.importProviderPlace(input);
    this.refreshPlaceQualityIssues();
    return result;
  }

  listPlaces(filter: { status?: PlaceStatus; minCategoryConfidence?: number; limit?: number; offset?: number }) {
    const places = this.deps.placeService?.listCanonicalPlaces() ?? [];
    const rows = places.filter((place) => {
      if (filter.status && place.status !== filter.status) return false;
      if (typeof filter.minCategoryConfidence === "number" && place.categoryConfidence < filter.minCategoryConfidence) return false;
      return true;
    });
    const offset = Math.max(0, filter.offset ?? 0);
    const limit = Math.max(1, Math.min(filter.limit ?? 50, 200));
    return { total: rows.length, items: rows.slice(offset, offset + limit) };
  }


  detectPlaceDuplicateCandidates() {
    if (!this.maintenanceService) return [];
    return this.maintenanceService.detectDuplicateCandidates();
  }

  listPlaceDuplicateCandidates(status?: string) {
    return this.deps.placeService?.store.listDuplicateCandidates(status as never) ?? [];
  }

  reviewPlaceDuplicateCandidate(input: { actorUserId: string; candidateId: string; status: "approved" | "rejected"; note?: string }) {
    if (!this.maintenanceService) return undefined;
    return this.maintenanceService.reviewDuplicateCandidate(input);
  }

  mergeCanonicalPlaces(input: { actorUserId: string; targetPlaceId: string; sourcePlaceIds: string[]; reason?: string; allowFarDistance?: boolean }) {
    if (!this.maintenanceService) return undefined;
    return this.maintenanceService.mergePlaces(input);
  }

  correctCanonicalPlace(input: {
    actorUserId: string;
    placeId: string;
    reason: string;
    note?: string;
    updates: Record<string, unknown>;
  }) {
    if (!this.maintenanceService) return undefined;
    return this.maintenanceService.correctPlace({
      placeId: input.placeId,
      actorUserId: input.actorUserId,
      reason: input.reason,
      note: input.note,
      updates: input.updates as never
    });
  }

  reassignPlaceAttachment(input: { actorUserId: string; linkId: string; toPlaceId: string; reason: string }) {
    if (!this.maintenanceService) return undefined;
    return this.maintenanceService.reassignAttachment(input);
  }

  listPlaceMaintenanceAudits(placeId?: string) {
    return this.deps.placeService?.store.listMaintenanceAudits(placeId) ?? [];
  }

  getModerationQueue(filter: { targetType?: ModerationTargetRef["targetType"]; state?: string; severity?: string; limit?: number }) {
    return this.deps.moderationService.listQueue({ ...filter, limit: filter.limit ?? 100 } as never);
  }

  getTargetModeration(target: ModerationTargetRef) {
    return this.deps.moderationService.getTargetDetails(target);
  }

  async applyModerationAction(input: { actorUserId: string; target: ModerationTargetRef; decisionType: ModerationDecisionType; reasonCode: string; notes?: string }) {
    const before = this.deps.moderationService.getAggregate(input.target);
    const decision = await this.deps.moderationService.adminDecision(input);
    const after = this.deps.moderationService.getAggregate(input.target);
    this.recordAudit({ actorUserId: input.actorUserId, actionType: `moderation.${input.decisionType}`, targetType: input.target.targetType, targetId: input.target.targetId, reason: input.reasonCode, note: input.notes, before: before as never, after: after as never });
    return { decision, before, after };
  }

  suspendUser(input: { actorUserId: string; userId: string; reason: string; note?: string }) {
    const before = this.deps.accountsService.getIdentitySummary(input.userId).user;
    const after = this.deps.accountsService.updateUserStatus(input.userId, UserStatus.SUSPENDED);
    this.recordAudit({ actorUserId: input.actorUserId, actionType: "users.suspend", targetType: "user", targetId: input.userId, reason: input.reason, note: input.note, before: before as never, after: after as never });
    return after;
  }

  reinstateUser(input: { actorUserId: string; userId: string; reason: string; note?: string }) {
    const before = this.deps.accountsService.getIdentitySummary(input.userId).user;
    const after = this.deps.accountsService.updateUserStatus(input.userId, UserStatus.ACTIVE);
    this.recordAudit({ actorUserId: input.actorUserId, actionType: "users.reinstate", targetType: "user", targetId: input.userId, reason: input.reason, note: input.note, before: before as never, after: after as never });
    return after;
  }

  listAuditLogs(limit = 100) {
    return this.audit.slice(-Math.max(1, Math.min(limit, 500))).reverse();
  }

  private recordAudit(input: Omit<AdminActionAudit, "id" | "createdAt">) {
    this.audit.push({ ...input, id: `adm_audit_${randomUUID()}`, createdAt: new Date().toISOString() });
  }
}
