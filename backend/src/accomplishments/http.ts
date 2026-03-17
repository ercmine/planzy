import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { AccomplishmentsService } from "./service.js";
import type { AccomplishmentEvent } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header required"]);
  return userId;
}

export function createAccomplishmentsHttpHandlers(service: AccomplishmentsService) {
  return {
    catalog: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { definitions: service.getCatalog() });
    },
    summary: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      sendJson(res, 200, service.getUserSummary(userId));
    },
    recordEvent: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const type = String(payload.type ?? "");
      const eventId = String(payload.eventId ?? "");
      if (!type || !eventId) throw new ValidationError(["type and eventId are required"]);
      const result = await service.recordEvent({
        eventId,
        userId,
        type: type as AccomplishmentEvent["type"],
        occurredAt: payload.occurredAt == null ? undefined : String(payload.occurredAt),
        canonicalPlaceId: payload.canonicalPlaceId == null ? undefined : String(payload.canonicalPlaceId),
        cityId: payload.cityId == null ? undefined : String(payload.cityId),
        categoryId: payload.categoryId == null ? undefined : String(payload.categoryId),
        contributionState: payload.contributionState == null ? undefined : String(payload.contributionState) as AccomplishmentEvent["contributionState"],
        trustedCreator: payload.trustedCreator === true,
        trustScoreDelta: typeof payload.trustScoreDelta === "number" ? payload.trustScoreDelta : undefined,
        value: typeof payload.value === "number" ? payload.value : undefined
      });
      sendJson(res, 200, result);
    },
    updateFeatured: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const ids = Array.isArray(payload.badgeIds) ? payload.badgeIds.map((item) => String(item)) : [];
      sendJson(res, 200, { featured: service.setFeaturedBadges(userId, ids) });
    }
  };
}
