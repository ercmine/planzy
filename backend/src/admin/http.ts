import type { IncomingMessage, ServerResponse } from "node:http";

import { UserRole } from "../accounts/types.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { AdminPermission } from "./types.js";
import { AdminService } from "./service.js";

const ROLE_PERMISSIONS: Record<UserRole, AdminPermission[]> = {
  [UserRole.USER]: [],
  [UserRole.CREATOR]: [],
  [UserRole.BUSINESS_OWNER]: [],
  [UserRole.BUSINESS_MANAGER]: [],
  [UserRole.MODERATOR]: ["admin.read", "admin.moderation", "admin.audit.read"],
  [UserRole.ADMIN]: [
    "admin.read",
    "admin.moderation",
    "admin.users.manage",
    "admin.creators.manage",
    "admin.businesses.manage",
    "admin.places.manage",
    "admin.subscriptions.read",
    "admin.subscriptions.manage",
    "admin.ads.read",
    "admin.ads.manage",
    "admin.source_health.read",
    "admin.ops.manage",
    "admin.audit.read"
  ]
};

function getActor(service: AdminService, req: IncomingMessage) {
  const userId = readHeader(req, "x-user-id");
  if (!userId) return null;
  const roles = service.getRolesForUser(userId);
  const permissions = [...new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role] ?? []))];
  return { userId, roles, permissions };
}

function ensurePermission(service: AdminService, req: IncomingMessage, res: ServerResponse, permission: AdminPermission): { userId: string } | null {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (expectedKey && readHeader(req, "x-admin-key") === expectedKey) {
    return { userId: readHeader(req, "x-user-id") ?? "admin-key" };
  }
  const actor = getActor(service, req);
  if (!actor) {
    sendJson(res, 401, { error: "unauthorized", requiredPermission: permission });
    return null;
  }
  if (!actor.permissions.includes(permission)) {
    sendJson(res, 403, { error: "forbidden", requiredPermission: permission });
    return null;
  }
  return { userId: actor.userId };
}

export function createAdminHttpHandlers(service: AdminService) {
  return {
    async overview(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.read")) return;
      sendJson(res, 200, await service.getOverview());
    },
    async listUsers(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.read")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, service.listUsers({ search: url.searchParams.get("search") ?? undefined, status: (url.searchParams.get("status") as never) ?? undefined, role: (url.searchParams.get("role") as never) ?? undefined, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) }));
    },
    async listModerationQueue(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.moderation")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, { queue: service.getModerationQueue({ targetType: (url.searchParams.get("targetType") as never) ?? undefined, state: url.searchParams.get("state") ?? undefined, severity: url.searchParams.get("severity") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 100) }) });
    },
    async moderationTarget(req: IncomingMessage, res: ServerResponse, encodedType: string, encodedId: string) {
      if (!ensurePermission(service, req, res, "admin.moderation")) return;
      sendJson(res, 200, service.getTargetModeration({ targetType: decodeURIComponent(encodedType) as never, targetId: decodeURIComponent(encodedId) }));
    },
    async moderationAction(req: IncomingMessage, res: ServerResponse) {
      const actor = ensurePermission(service, req, res, "admin.moderation");
      if (!actor) return;
      const body = await parseJsonBody(req) as { target: unknown; decisionType: unknown; reasonCode: unknown; notes?: unknown };
      sendJson(res, 200, await service.applyModerationAction({ actorUserId: actor.userId, target: body.target as never, decisionType: body.decisionType as never, reasonCode: String(body.reasonCode ?? "admin_action"), notes: typeof body.notes === "string" ? body.notes : undefined }));
    },


    async detectPlaceDuplicates(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      sendJson(res, 200, { items: service.detectPlaceDuplicateCandidates() });
    },
    async listPlaceDuplicateCandidates(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, { items: service.listPlaceDuplicateCandidates(url.searchParams.get("status") ?? undefined) });
    },
    async reviewPlaceDuplicateCandidate(req: IncomingMessage, res: ServerResponse, candidateId: string) {
      const actor = ensurePermission(service, req, res, "admin.places.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { status?: unknown; note?: unknown };
      const updated = service.reviewPlaceDuplicateCandidate({
        actorUserId: actor.userId,
        candidateId: decodeURIComponent(candidateId),
        status: (String(body.status ?? "rejected") as "approved" | "rejected"),
        note: typeof body.note === "string" ? body.note : undefined
      });
      if (!updated) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      sendJson(res, 200, updated);
    },
    async mergeCanonicalPlaces(req: IncomingMessage, res: ServerResponse) {
      const actor = ensurePermission(service, req, res, "admin.places.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { targetPlaceId?: unknown; sourcePlaceIds?: unknown; reason?: unknown; allowFarDistance?: unknown };
      try {
        const merged = service.mergeCanonicalPlaces({
          actorUserId: actor.userId,
          targetPlaceId: String(body.targetPlaceId ?? ""),
          sourcePlaceIds: Array.isArray(body.sourcePlaceIds) ? body.sourcePlaceIds.map((item) => String(item)) : [],
          reason: typeof body.reason === "string" ? body.reason : undefined,
          allowFarDistance: Boolean(body.allowFarDistance)
        });
        if (!merged) {
          sendJson(res, 503, { error: "place_service_unavailable" });
          return;
        }
        sendJson(res, 200, merged);
      } catch (error) {
        sendJson(res, 400, { error: "invalid_merge", detail: error instanceof Error ? error.message : String(error) });
      }
    },
    async correctCanonicalPlace(req: IncomingMessage, res: ServerResponse, placeId: string) {
      const actor = ensurePermission(service, req, res, "admin.places.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { updates?: unknown; reason?: unknown; note?: unknown };
      const corrected = service.correctCanonicalPlace({
        actorUserId: actor.userId,
        placeId: decodeURIComponent(placeId),
        reason: String(body.reason ?? "admin_correction"),
        note: typeof body.note === "string" ? body.note : undefined,
        updates: typeof body.updates === "object" && body.updates ? body.updates as Record<string, unknown> : {}
      });
      if (!corrected) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      sendJson(res, 200, corrected);
    },
    async reassignPlaceAttachment(req: IncomingMessage, res: ServerResponse) {
      const actor = ensurePermission(service, req, res, "admin.places.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { linkId?: unknown; toPlaceId?: unknown; reason?: unknown };
      try {
        const result = service.reassignPlaceAttachment({
          actorUserId: actor.userId,
          linkId: String(body.linkId ?? ""),
          toPlaceId: String(body.toPlaceId ?? ""),
          reason: String(body.reason ?? "admin_reassignment")
        });
        if (!result) {
          sendJson(res, 503, { error: "place_service_unavailable" });
          return;
        }
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 400, { error: "invalid_attachment_reassignment", detail: error instanceof Error ? error.message : String(error) });
      }
    },
    async listPlaceMaintenanceAudits(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.audit.read")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, { items: service.listPlaceMaintenanceAudits(url.searchParams.get("placeId") ?? undefined) });
    },
    async placeQualityOverview(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      sendJson(res, 200, service.getPlaceQualityOverview());
    },
    async listPlaceQualityIssues(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, service.listPlaceQualityIssues({
        issueType: url.searchParams.get("issueType") ?? undefined,
        severity: url.searchParams.get("severity") ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
        provider: url.searchParams.get("provider") ?? undefined,
        city: url.searchParams.get("city") ?? undefined,
        category: url.searchParams.get("category") ?? undefined,
        placeId: url.searchParams.get("placeId") ?? undefined,
        page: Number(url.searchParams.get("page") ?? 0),
        pageSize: Number(url.searchParams.get("pageSize") ?? 50)
      }));
    },
    async placeQualityIssueDetail(req: IncomingMessage, res: ServerResponse, issueId: string) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      const issue = service.getPlaceQualityIssue(decodeURIComponent(issueId));
      if (!issue) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      sendJson(res, 200, issue);
    },
    async placeQualitySummary(req: IncomingMessage, res: ServerResponse, placeId: string) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      sendJson(res, 200, service.getPlaceQualitySummary(decodeURIComponent(placeId)));
    },
    async providerQualitySummary(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.source_health.read")) return;
      sendJson(res, 200, { providers: service.getProviderQualitySummary() });
    },
    async updatePlaceQualityIssueStatus(req: IncomingMessage, res: ServerResponse, issueId: string) {
      const actor = ensurePermission(service, req, res, "admin.places.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { status?: unknown; note?: unknown };
      const updated = service.updatePlaceQualityIssueStatus({
        actorUserId: actor.userId,
        issueId: decodeURIComponent(issueId),
        status: String(body.status ?? "acknowledged") as never,
        note: typeof body.note === "string" ? body.note : undefined
      });
      if (!updated) {
        sendJson(res, 404, { error: "not_found" });
        return;
      }
      sendJson(res, 200, updated);
    },


    async importPlaceSource(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      const body = await parseJsonBody(req) as { provider?: unknown; rawPayload?: unknown; sourceUrl?: unknown; fetchedAt?: unknown; importBatchId?: unknown; syncRunId?: unknown };
      const created = service.importProviderPlaceForQuality({
        provider: String(body.provider ?? ""),
        rawPayload: body.rawPayload,
        sourceUrl: typeof body.sourceUrl === "string" ? body.sourceUrl : undefined,
        fetchedAt: typeof body.fetchedAt === "string" ? body.fetchedAt : undefined,
        importBatchId: typeof body.importBatchId === "string" ? body.importBatchId : undefined,
        syncRunId: typeof body.syncRunId === "string" ? body.syncRunId : undefined
      });
      if (!created) {
        sendJson(res, 503, { error: "place_service_unavailable" });
        return;
      }
      sendJson(res, 201, created);
    },

    async listPlaces(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.places.manage")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, service.listPlaces({ status: (url.searchParams.get("status") as never) ?? undefined, minCategoryConfidence: url.searchParams.has("minCategoryConfidence") ? Number(url.searchParams.get("minCategoryConfidence")) : undefined, limit: Number(url.searchParams.get("limit") ?? 50), offset: Number(url.searchParams.get("offset") ?? 0) }));
    },
    async sourceHealth(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.source_health.read")) return;
      sendJson(res, 200, service.getSourceHealth());
    },
    async subscriptionsOps(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.subscriptions.read")) return;
      sendJson(res, 200, service.getSubscriptionOps());
    },
    async adsOps(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.ads.read")) return;
      sendJson(res, 200, service.getAdsOps());
    },
    async businessClaims(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.businesses.manage")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, await service.listBusinessClaims({ status: url.searchParams.get("status") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 50) }));
    },
    async suspendUser(req: IncomingMessage, res: ServerResponse, userId: string) {
      const actor = ensurePermission(service, req, res, "admin.users.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { reasonCode?: unknown; note?: unknown };
      sendJson(res, 200, service.suspendUser({ actorUserId: actor.userId, userId: decodeURIComponent(userId), reason: String(body.reasonCode ?? "policy_violation"), note: typeof body.note === "string" ? body.note : undefined }));
    },
    async reinstateUser(req: IncomingMessage, res: ServerResponse, userId: string) {
      const actor = ensurePermission(service, req, res, "admin.users.manage");
      if (!actor) return;
      const body = await parseJsonBody(req) as { reasonCode?: unknown; note?: unknown };
      sendJson(res, 200, service.reinstateUser({ actorUserId: actor.userId, userId: decodeURIComponent(userId), reason: String(body.reasonCode ?? "manual_reinstate"), note: typeof body.note === "string" ? body.note : undefined }));
    },
    async audit(req: IncomingMessage, res: ServerResponse) {
      if (!ensurePermission(service, req, res, "admin.audit.read")) return;
      const url = new URL(req.url ?? "/", "http://localhost");
      sendJson(res, 200, { items: service.listAuditLogs(Number(url.searchParams.get("limit") ?? 100)) });
    }
  };
}
