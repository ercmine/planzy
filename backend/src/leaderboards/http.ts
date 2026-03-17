import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { LeaderboardsService } from "./service.js";
import type { LeaderboardContributionEvent, LeaderboardEntityType, LeaderboardWindow } from "./types.js";

function requireType(value: string): LeaderboardEntityType {
  if (!["creator", "explorer", "city", "category"].includes(value)) throw new ValidationError(["invalid leaderboard type"]);
  return value as LeaderboardEntityType;
}

function requireWindow(value: string): LeaderboardWindow {
  if (!["daily", "weekly", "monthly", "all_time"].includes(value)) throw new ValidationError(["invalid leaderboard window"]);
  return value as LeaderboardWindow;
}

export function createLeaderboardHttpHandlers(service: LeaderboardsService) {
  return {
    families: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { families: service.listFamilies() });
    },
    list: async (_req: IncomingMessage, res: ServerResponse, url: URL) => {
      const type = requireType(String(url.searchParams.get("type") ?? "creator"));
      const window = requireWindow(String(url.searchParams.get("window") ?? "weekly"));
      const limit = Number(url.searchParams.get("limit") ?? "50");
      sendJson(res, 200, { entries: service.getLeaderboard({ type, window, limit }) });
    },
    me: async (req: IncomingMessage, res: ServerResponse, url: URL) => {
      const type = requireType(String(url.searchParams.get("type") ?? "creator"));
      const window = requireWindow(String(url.searchParams.get("window") ?? "weekly"));
      const userId = readHeader(req, "x-user-id");
      if (!userId) throw new ValidationError(["x-user-id header required"]);
      sendJson(res, 200, service.getMyRank({ type, window, userId }));
    },
    record: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const event: LeaderboardContributionEvent = {
        eventId: String(payload.eventId ?? ""),
        actorUserId: String(payload.actorUserId ?? ""),
        creatorUserId: payload.creatorUserId == null ? undefined : String(payload.creatorUserId),
        explorerUserId: payload.explorerUserId == null ? undefined : String(payload.explorerUserId),
        canonicalPlaceId: payload.canonicalPlaceId == null ? undefined : String(payload.canonicalPlaceId),
        normalizedCityId: payload.normalizedCityId == null ? undefined : String(payload.normalizedCityId),
        normalizedCategoryId: payload.normalizedCategoryId == null ? undefined : String(payload.normalizedCategoryId),
        actionType: String(payload.actionType ?? "review_published") as LeaderboardContributionEvent["actionType"],
        qualityScore: typeof payload.qualityScore === "number" ? payload.qualityScore : undefined,
        engagementScore: typeof payload.engagementScore === "number" ? payload.engagementScore : undefined,
        actorTrustTier: payload.actorTrustTier == null ? undefined : String(payload.actorTrustTier) as LeaderboardContributionEvent["actorTrustTier"],
        targetTrustTier: payload.targetTrustTier == null ? undefined : String(payload.targetTrustTier) as LeaderboardContributionEvent["targetTrustTier"],
        moderationState: payload.moderationState == null ? undefined : String(payload.moderationState) as LeaderboardContributionEvent["moderationState"],
        suspicious: payload.suspicious === true,
        occurredAt: payload.occurredAt == null ? new Date().toISOString() : String(payload.occurredAt)
      };
      if (!event.eventId || !event.actorUserId) throw new ValidationError(["eventId and actorUserId are required"]);
      const result = await service.recordEvent(event);
      service.rebuildSnapshots();
      sendJson(res, 200, result);
    },
    inspect: async (_req: IncomingMessage, res: ServerResponse, type: string, entityId: string, url: URL) => {
      const result = service.inspectEntity({
        type: requireType(type),
        entityId,
        window: requireWindow(String(url.searchParams.get("window") ?? "weekly"))
      });
      sendJson(res, 200, { snapshot: result ?? null });
    },
    tune: async (req: IncomingMessage, res: ServerResponse, type: string) => {
      const body = await parseJsonBody(req);
      const payload = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
      const next = service.tuneFormula(requireType(type), {
        version: payload.version == null ? undefined : String(payload.version),
        minimumQualityThreshold: typeof payload.minimumQualityThreshold === "number" ? payload.minimumQualityThreshold : undefined,
        maxActionsPerPlacePerDay: typeof payload.maxActionsPerPlacePerDay === "number" ? payload.maxActionsPerPlacePerDay : undefined,
        requireDistinctPlaces: typeof payload.requireDistinctPlaces === "number" ? payload.requireDistinctPlaces : undefined,
        weights: typeof payload.weights === "object" && payload.weights !== null ? payload.weights as Record<string, number> as never : undefined
      });
      service.rebuildSnapshots();
      sendJson(res, 200, { formula: next });
    },
    formulas: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { formulas: service.listFormulas() });
    }
  };
}
