import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { GamificationControlService } from "./service.js";
import type { GamificationEvent } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header required"]);
  return userId;
}

function requireAdminId(req: IncomingMessage): string {
  const adminId = readHeader(req, "x-admin-id");
  if (!adminId) throw new ValidationError(["x-admin-id header required"]);
  return adminId;
}

export function createGamificationControlHttpHandlers(service: GamificationControlService) {
  return {
    summary: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.getProgressionSummary(requireUserId(req)));
    },
    processEvent: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const event: GamificationEvent = {
        eventId: String(payload.eventId ?? ""),
        dedupeKey: payload.dedupeKey == null ? undefined : String(payload.dedupeKey),
        userId: requireUserId(req),
        actionType: String(payload.actionType ?? "") as GamificationEvent["actionType"],
        occurredAt: String(payload.occurredAt ?? new Date().toISOString()),
        canonicalPlaceId: payload.canonicalPlaceId == null ? undefined : String(payload.canonicalPlaceId),
        cityId: payload.cityId == null ? undefined : String(payload.cityId),
        categoryId: payload.categoryId == null ? undefined : String(payload.categoryId),
        trustScore: Number(payload.trustScore ?? 0),
        moderationState: payload.moderationState == null ? undefined : String(payload.moderationState) as GamificationEvent["moderationState"],
        qualityScore: typeof payload.qualityScore === "number" ? payload.qualityScore : undefined,
        source: "app"
      };
      if (!event.eventId || !event.actionType) throw new ValidationError(["eventId and actionType are required"]);
      sendJson(res, 200, service.processEvent(event));
    },
    createDraft: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      sendJson(res, 200, service.createDraft(requireAdminId(req), payload.notes == null ? undefined : String(payload.notes)));
    },
    publish: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      sendJson(res, 200, service.publishRuleVersion(String(payload.ruleVersionId ?? ""), requireAdminId(req), payload.effectiveFrom == null ? undefined : String(payload.effectiveFrom)));
    },
    recompute: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const userId = String(payload.userId ?? "");
      if (!userId) throw new ValidationError(["userId is required"]);
      service.recomputeUser(userId, requireAdminId(req));
      sendJson(res, 200, { ok: true });
    },
    adminSnapshot: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.getAdminSnapshot());
    },
    explainDecision: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      sendJson(res, 200, { decision: service.explainDecision(String(payload.decisionId ?? "")) });
    }
  };
}
