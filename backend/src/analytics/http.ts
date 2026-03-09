import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { AnalyticsQueryService } from "./queryService.js";
import type { AnalyticsService } from "./service.js";

function parseRange(req: IncomingMessage): { from: Date; to: Date } {
  const base = `http://${req.headers.host ?? "localhost"}`;
  const url = new URL(req.url ?? "/", base);
  const from = new Date(url.searchParams.get("from") ?? Date.now() - 7 * 24 * 60 * 60 * 1000);
  const to = new Date(url.searchParams.get("to") ?? Date.now());
  return { from, to };
}

export function createAnalyticsHttpHandlers(service: AnalyticsService, query: AnalyticsQueryService) {
  return {
    async ingest(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const body = await parseJsonBody(req);
      const events = Array.isArray(body) ? body : (body as { events?: unknown[] })?.events;
      if (!Array.isArray(events)) throw new ValidationError(["events array required"]);
      const result = await service.ingestBatch({
        actorUserId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined,
        actorProfileType: (String(readHeader(req, "x-acting-profile-type") ?? "").trim() as "user" | "creator" | "business" | "admin" | "system") || undefined,
        actorProfileId: String(readHeader(req, "x-acting-profile-id") ?? "").trim() || undefined,
        sessionId: String(readHeader(req, "x-session-id") ?? "").trim() || undefined,
        anonymousId: String(readHeader(req, "x-anonymous-id") ?? "").trim() || undefined,
        requestId: String(readHeader(req, "x-request-id") ?? "").trim() || undefined,
        sourceRoute: String(readHeader(req, "x-source-route") ?? "").trim() || undefined,
        environment: process.env.NODE_ENV ?? "dev",
        platform: "backend"
      }, events);
      sendJson(res, 200, result);
    },

    async adminOverview(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if ((process.env.ADMIN_API_KEY ?? "") !== String(readHeader(req, "x-admin-key") ?? "")) {
        sendJson(res, 403, { error: "forbidden" });
        return;
      }
      const { from, to } = parseRange(req);
      sendJson(res, 200, await query.adminOverview(from, to));
    },

    async creatorOverview(req: IncomingMessage, res: ServerResponse, creatorId: string): Promise<void> {
      const actorId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
      const actorType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
      if (actorType !== "creator" || actorId !== creatorId) {
        sendJson(res, 403, { error: "forbidden" });
        return;
      }
      const { from, to } = parseRange(req);
      sendJson(res, 200, await query.creatorOverview(creatorId, from, to));
    },

    async businessOverview(req: IncomingMessage, res: ServerResponse, businessId: string): Promise<void> {
      const actorId = String(readHeader(req, "x-acting-profile-id") ?? "").trim();
      const actorType = String(readHeader(req, "x-acting-profile-type") ?? "").trim();
      if (actorType !== "business" || actorId !== businessId) {
        sendJson(res, 403, { error: "forbidden" });
        return;
      }
      const { from, to } = parseRange(req);
      sendJson(res, 200, await query.businessOverview(businessId, from, to));
    }
  };
}
