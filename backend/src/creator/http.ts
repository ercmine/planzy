import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CreatorService } from "./service.js";

function userId(req: IncomingMessage): string {
  const id = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!id) throw new ValidationError(["x-user-id header is required"]);
  return id;
}

function mapError(res: ServerResponse, error: unknown): void {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (["CREATOR_NOT_FOUND", "GUIDE_NOT_FOUND"].includes(code)) return sendJson(res, 404, { error: code });
  if (["GUIDE_QUOTA_EXCEEDED"].includes(code)) return sendJson(res, 429, { error: code });
  if (["CREATOR_NOT_FOLLOWABLE"].includes(code)) return sendJson(res, 400, { error: code });
  if (["CREATOR_CONTEXT_NOT_ALLOWED", "CREATOR_ROLE_REQUIRED", "CREATOR_PLAN_REQUIRED"].includes(code)) return sendJson(res, 403, { error: code });
  if (["SLUG_TAKEN", "HANDLE_TAKEN"].includes(code)) return sendJson(res, 409, { error: code });
  if (error instanceof ValidationError) return sendJson(res, 400, { error: error.message, details: error.details });
  throw error;
}

export function createCreatorHttpHandlers(service: CreatorService) {
  return {
    async upsertProfile(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const uid = userId(req);
        const body = (await parseJsonBody(req)) as { displayName: string; handle?: string; bio?: string; slug?: string };
        service.bootstrapFromAccounts(uid);
        const profile = await service.createOrSyncCreatorProfile(uid, body);
        sendJson(res, 200, { profile });
      } catch (error) {
        mapError(res, error);
      }
    },

    async updateProfile(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const uid = userId(req);
        const body = (await parseJsonBody(req)) as Parameters<CreatorService["updateCreatorProfile"]>[2];
        const profile = await service.updateCreatorProfile(uid, creatorProfileId, body);
        sendJson(res, 200, { profile });
      } catch (error) {
        mapError(res, error);
      }
    },

    async getPublicProfile(req: IncomingMessage, res: ServerResponse, slug: string): Promise<void> {
      try {
        const viewer = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
        const reviewSort = String(new URL(req.url ?? "", "http://localhost").searchParams.get("reviewSort") ?? "latest") === "top" ? "top" : "latest";
        const profile = await service.getPublicProfile(slug, viewer, { reviewSort });
        sendJson(res, 200, { profile });
      } catch (error) {
        mapError(res, error);
      }
    },



    async checkHandleAvailability(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const handle = String(search.get("handle") ?? "").trim();
        const currentProfileId = String(search.get("currentProfileId") ?? "").trim() || undefined;
        const result = service.checkHandleAvailability(handle, currentProfileId);
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },

    async listFollows(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const limit = Number(search.get("limit") ?? "100");
        const creators = service.listFollowedCreators(userId(req), limit);
        sendJson(res, 200, { creators });
      } catch (error) {
        mapError(res, error);
      }
    },

    async followingFeed(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const cursor = String(search.get("cursor") ?? "").trim() || undefined;
        const limit = Number(search.get("limit") ?? "20");
        const typeRaw = String(search.get("type") ?? "all").trim();
        const type = (["all", "reviews", "videos", "guides"].includes(typeRaw) ? typeRaw : "all") as "all" | "reviews" | "videos" | "guides";
        const feed = await service.getFollowingFeed(userId(req), { cursor, limit, type });
        sendJson(res, 200, feed);
      } catch (error) {
        mapError(res, error);
      }
    },

    async placeCreatorContent(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const viewer = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
        const cursor = String(search.get("cursor") ?? "").trim() || undefined;
        const limit = Number(search.get("limit") ?? "20");
        const typeRaw = String(search.get("type") ?? "all").trim();
        const type = (["all", "reviews", "videos", "guides"].includes(typeRaw) ? typeRaw : "all") as "all" | "reviews" | "videos" | "guides";
        const content = await service.getPlaceCreatorContent(placeId, viewer, { cursor, limit, type });
        sendJson(res, 200, content);
      } catch (error) {
        mapError(res, error);
      }
    },

    async follow(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const result = await service.followCreator(userId(req), creatorProfileId);
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },

    async unfollow(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const result = await service.unfollowCreator(userId(req), creatorProfileId);
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },

    async createGuide(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const guide = await service.createGuide(userId(req), creatorProfileId, await parseJsonBody(req) as never);
        sendJson(res, 201, { guide });
      } catch (error) {
        mapError(res, error);
      }
    },

    async updateGuide(req: IncomingMessage, res: ServerResponse, guideId: string): Promise<void> {
      try {
        const guide = await service.updateGuide(userId(req), guideId, await parseJsonBody(req) as never);
        sendJson(res, 200, { guide });
      } catch (error) {
        mapError(res, error);
      }
    },

    async getGuide(req: IncomingMessage, res: ServerResponse, slug: string, guideSlug: string): Promise<void> {
      try {
        const viewer = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
        const guide = service.getGuideBySlug(slug, guideSlug, viewer);
        sendJson(res, 200, { guide });
      } catch (error) {
        mapError(res, error);
      }
    },



    async searchGuides(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const search = new URL(req.url ?? "", "http://localhost").searchParams;
        const query = String(search.get("q") ?? "").trim() || undefined;
        const city = String(search.get("city") ?? "").trim() || undefined;
        const guideType = String(search.get("guideType") ?? "").trim() || undefined;
        const cursor = String(search.get("cursor") ?? "").trim() || undefined;
        const limit = Number(search.get("limit") ?? "20");
        const result = await service.searchGuides({ query, city, guideType: guideType as never, cursor, limit });
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },
    async analytics(req: IncomingMessage, res: ServerResponse, creatorProfileId: string): Promise<void> {
      try {
        const summary = service.getCreatorAnalytics(userId(req), creatorProfileId);
        sendJson(res, 200, { summary });
      } catch (error) {
        mapError(res, error);
      }
    }
  };
}
