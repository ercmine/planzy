import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { ChallengesService } from "./service.js";
import type { ChallengeDefinition, ChallengeEvent } from "./types.js";

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

export function createChallengesHttpHandlers(service: ChallengesService) {
  return {
    list: async (req: IncomingMessage, res: ServerResponse, url: URL) => {
      const userId = requireUserId(req);
      const track = url.searchParams.get("track") ?? undefined;
      const cityId = url.searchParams.get("cityId") ?? undefined;
      const marketId = url.searchParams.get("marketId") ?? undefined;
      const neighborhoodId = url.searchParams.get("neighborhoodId") ?? undefined;
      const categoryId = url.searchParams.get("categoryId") ?? undefined;
      const cadence = url.searchParams.get("cadence") ?? undefined;
      sendJson(res, 200, { challenges: service.listAvailable(userId, { track, cityId, marketId, neighborhoodId, categoryId, cadence }) });
    },
    summary: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.getSummary(requireUserId(req)));
    },
    questHub: async (req: IncomingMessage, res: ServerResponse, url: URL) => {
      const userId = requireUserId(req);
      const cityId = url.searchParams.get("cityId") ?? undefined;
      const marketId = url.searchParams.get("marketId") ?? undefined;
      const categoryId = url.searchParams.get("categoryId") ?? undefined;
      const track = url.searchParams.get("track") ?? undefined;
      sendJson(res, 200, service.getQuestHub(userId, { cityId, marketId, categoryId, track }));
    },
    detail: async (req: IncomingMessage, res: ServerResponse, challengeId: string) => {
      const detail = service.getChallengeDetail(requireUserId(req), challengeId);
      if (!detail) {
        sendJson(res, 404, { error: "challenge_not_found" });
        return;
      }
      sendJson(res, 200, detail);
    },
    upsert: async (req: IncomingMessage, res: ServerResponse) => {
      requireAdmin(req);
      const payload = await parseJsonBody(req);
      if (typeof payload !== "object" || payload === null) throw new ValidationError(["challenge payload required"]);
      sendJson(res, 200, service.upsertDefinition(payload as ChallengeDefinition));
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
        marketId: payload.marketId == null ? undefined : String(payload.marketId),
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
