import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { BusinessAnalyticsService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const id = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!id) throw new ValidationError(["x-user-id header is required"]);
  return id;
}

function mapError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (["ANALYTICS_ACCESS_DENIED"].includes(code)) return sendJson(res, 403, { error: code });
  if (["PLACE_SCOPE_REQUIRED"].includes(code)) return sendJson(res, 400, { error: code });
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, details: error.details });
  throw error;
}

export function createBusinessAnalyticsHttpHandlers(service: BusinessAnalyticsService) {
  return {
    async trackEvent(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const body = await parseJsonBody(req) as Parameters<BusinessAnalyticsService["recordEvent"]>[0];
        const event = await service.recordEvent(body);
        sendJson(res, 201, { eventId: event.id });
      } catch (error) {
        mapError(res, error);
      }
    },

    async dashboard(req: IncomingMessage, res: ServerResponse, businessProfileId: string): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const placeIds = String(search.get("placeIds") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
        const from = String(search.get("from") ?? "").trim();
        const to = String(search.get("to") ?? "").trim();
        const compareFrom = String(search.get("compareFrom") ?? "").trim() || undefined;
        const compareTo = String(search.get("compareTo") ?? "").trim() || undefined;
        const dashboard = await service.getDashboard(requireUserId(req), {
          businessProfileId,
          placeIds,
          from,
          to,
          compareFrom,
          compareTo,
          includeCreatorImpact: true
        }, Boolean(readHeader(req, "x-admin-key")));
        sendJson(res, 200, { dashboard });
      } catch (error) {
        mapError(res, error);
      }
    }
  };
}
