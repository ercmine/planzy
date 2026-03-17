import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CollectionsService } from "./service.js";
import type { CollectionActivityEvent, CollectionDefinition } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header required"]);
  return userId;
}

function requireAdmin(req: IncomingMessage): string {
  const adminUserId = readHeader(req, "x-admin-user-id");
  if (!adminUserId) throw new ValidationError(["x-admin-user-id header required"]);
  return adminUserId;
}

export function createCollectionsHttpHandlers(service: CollectionsService) {
  return {
    list: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { collections: service.listAvailableCollections(requireUserId(req)) });
    },
    detail: async (req: IncomingMessage, res: ServerResponse, collectionId: string) => {
      const payload = service.getCollectionDetail(requireUserId(req), collectionId);
      if (!payload) return sendJson(res, 404, { error: "collection_not_found" });
      return sendJson(res, 200, payload);
    },
    upsert: async (req: IncomingMessage, res: ServerResponse) => {
      requireAdmin(req);
      const payload = await parseJsonBody(req);
      if (typeof payload !== "object" || payload === null) throw new ValidationError(["collection payload required"]);
      sendJson(res, 200, service.upsertDefinition(payload as CollectionDefinition));
    },
    recordEvent: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      if (!payload.eventId || !payload.canonicalPlaceId || !payload.actionType) throw new ValidationError(["eventId, canonicalPlaceId, actionType required"]);
      const event: CollectionActivityEvent = {
        eventId: String(payload.eventId),
        userId,
        canonicalPlaceId: String(payload.canonicalPlaceId),
        actionType: String(payload.actionType) as CollectionActivityEvent["actionType"],
        occurredAtISO: String(payload.occurredAtISO ?? new Date().toISOString()),
        moderationState: payload.moderationState as CollectionActivityEvent["moderationState"],
        suspicious: payload.suspicious === true,
        trustedCreator: payload.trustedCreator === true,
        trustScore: typeof payload.trustScore === "number" ? payload.trustScore : undefined,
        moderationStrikes: typeof payload.moderationStrikes === "number" ? payload.moderationStrikes : undefined
      };
      sendJson(res, 200, await service.recordActivity(event));
    }
  };
}
