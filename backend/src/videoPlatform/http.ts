import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { VideoPlatformService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export interface VideoPlatformHttpHandlers {
  createDraft(req: IncomingMessage, res: ServerResponse): Promise<void>;
  requestUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  finalizeUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  publish(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  updateDraft(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  listStudio(req: IncomingMessage, res: ServerResponse): Promise<void>;
  listFeed(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
  listPlaceVideos(req: IncomingMessage, res: ServerResponse, placeId: string): Promise<void>;
  listCreatorVideos(req: IncomingMessage, res: ServerResponse, userId: string): Promise<void>;
}

export function createVideoPlatformHttpHandlers(service: VideoPlatformService): VideoPlatformHttpHandlers {
  return {
    async createDraft(req, res) {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req) as { canonicalPlaceId?: string; title?: string; caption?: string; rating?: number };
      if (!body?.canonicalPlaceId) throw new ValidationError(["canonicalPlaceId is required"]);
      const video = await service.createDraft({ userId, canonicalPlaceId: body.canonicalPlaceId, title: body.title, caption: body.caption, rating: body.rating });
      sendJson(res, 201, { video });
    },
    async requestUpload(req, res, videoId) {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req) as { fileName?: string; contentType?: string; sizeBytes?: number };
      if (!body?.fileName || !body?.contentType || typeof body.sizeBytes !== "number") {
        throw new ValidationError(["fileName, contentType, sizeBytes are required"]);
      }
      const uploadSession = await service.requestUploadSession({ userId, videoId, fileName: body.fileName, contentType: body.contentType, sizeBytes: body.sizeBytes });
      sendJson(res, 201, { uploadSession });
    },
    async finalizeUpload(req, res, videoId) {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req) as { uploadSessionId?: string; durationMs?: number; width?: number; height?: number };
      if (!body?.uploadSessionId) throw new ValidationError(["uploadSessionId is required"]);
      const video = await service.finalizeUpload({ userId, videoId, uploadSessionId: body.uploadSessionId, durationMs: body.durationMs, width: body.width, height: body.height });
      sendJson(res, 200, { video });
    },
    async publish(req, res, videoId) {
      const userId = requireUserId(req);
      sendJson(res, 200, { video: await service.publish({ userId, videoId }) });
    },
    async updateDraft(req, res, videoId) {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req) as { title?: string; caption?: string; rating?: number; canonicalPlaceId?: string; status?: never };
      sendJson(res, 200, { video: await service.updateDraft({ userId, videoId, ...body }) });
    },
    async listStudio(req, res) {
      sendJson(res, 200, { items: await service.listStudio(requireUserId(req)) });
    },
    async listFeed(_req, res, query) {
      const limit = Number.parseInt(query.get("limit") ?? "10", 10);
      const cursor = query.get("cursor") ?? undefined;
      sendJson(res, 200, await service.listFeed({ limit, cursor }));
    },
    async listPlaceVideos(_req, res, placeId) {
      sendJson(res, 200, { items: await service.listPlaceVideos(placeId) });
    },
    async listCreatorVideos(_req, res, userId) {
      sendJson(res, 200, { items: await service.listCreatorVideos(userId) });
    }
  };
}
