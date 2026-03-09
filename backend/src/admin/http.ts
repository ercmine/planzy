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
