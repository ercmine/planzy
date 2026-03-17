import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { ChallengesService } from "./service.js";
import type { ChallengeEvent } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header required"]);
  return userId;
}

export function createChallengesHttpHandlers(service: ChallengesService) {
  return {
    list: async (req: IncomingMessage, res: ServerResponse, url: URL) => {
      const userId = requireUserId(req);
      const track = url.searchParams.get("track") ?? undefined;
      const cityId = url.searchParams.get("cityId") ?? undefined;
      const neighborhoodId = url.searchParams.get("neighborhoodId") ?? undefined;
      const categoryId = url.searchParams.get("categoryId") ?? undefined;
      sendJson(res, 200, { challenges: service.listAvailable(userId, { track: track ?? undefined, cityId, neighborhoodId, categoryId }) });
    },
    summary: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.getSummary(requireUserId(req)));
    },
    detail: async (req: IncomingMessage, res: ServerResponse, challengeId: string) => {
      const detail = service.getChallengeDetail(requireUserId(req), challengeId);
      if (!detail) {
        sendJson(res, 404, { error: "challenge_not_found" });
        return;
      }
      sendJson(res, 200, detail);
    },
    recordEvent: async (req: IncomingMessage, res: ServerResponse) => {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const eventId = String(payload.eventId ?? "");
      const type = String(payload.type ?? "");
      const canonicalPlaceId = String(payload.canonicalPlaceId ?? "");
      if (!eventId || !type || !canonicalPlaceId) throw new ValidationError(["eventId, type, canonicalPlaceId are required"]);
      const event: ChallengeEvent = {
        eventId,
        userId,
        type: type as ChallengeEvent["type"],
        canonicalPlaceId,
        occurredAt: payload.occurredAt == null ? undefined : String(payload.occurredAt),
        cityId: payload.cityId == null ? undefined : String(payload.cityId),
        neighborhoodId: payload.neighborhoodId == null ? undefined : String(payload.neighborhoodId),
        categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map((item) => String(item)) : [],
        hotspotIds: Array.isArray(payload.hotspotIds) ? payload.hotspotIds.map((item) => String(item)) : [],
        contentState: payload.contentState == null ? undefined : String(payload.contentState) as ChallengeEvent["contentState"],
        trustScore: typeof payload.trustScore === "number" ? payload.trustScore : undefined,
        suspicious: payload.suspicious === true
      };
      sendJson(res, 200, await service.recordEvent(event));
    }
  };
}
