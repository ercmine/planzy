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
  retryUpload(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  retryProcessing(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  processNextJob(_req: IncomingMessage, res: ServerResponse): Promise<void>;
  updateDraft(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  listStudio(req: IncomingMessage, res: ServerResponse): Promise<void>;
  getStudioAnalytics(req: IncomingMessage, res: ServerResponse): Promise<void>;
  archiveDraft(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  trackEvent(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  likeVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  unlikeVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  saveVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  unsaveVideo(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  listSavedVideos(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
  listWatchHistory(req: IncomingMessage, res: ServerResponse): Promise<void>;
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
      if (!body?.fileName || !body?.contentType || typeof body.sizeBytes !== "number") throw new ValidationError(["fileName, contentType, sizeBytes are required"]);
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
    async retryUpload(req, res, videoId) {
      const userId = requireUserId(req);
      sendJson(res, 200, { video: await service.retryUpload({ userId, videoId }) });
    },
    async retryProcessing(req, res, videoId) {
      const userId = requireUserId(req);
      sendJson(res, 200, { video: await service.retryProcessing({ userId, videoId }) });
    },
    async processNextJob(_req, res) {
      sendJson(res, 200, { job: await service.processNextQueuedJob() });
    },
    async updateDraft(req, res, videoId) {
      const userId = requireUserId(req);
      const body = await parseJsonBody(req) as { title?: string; caption?: string; rating?: number; canonicalPlaceId?: string; visibility?: "public" | "private" | "unlisted" };
      sendJson(res, 200, { video: await service.updateDraft({ userId, videoId, ...body }) });
    },
    async listStudio(req, res) {
      const query = new URL(req.url ?? "", "http://localhost").searchParams;
      const sectionRaw = String(query.get("section") ?? "").trim();
      const sortRaw = String(query.get("sort") ?? "newest").trim();
      const section = ["drafts", "processing", "published", "needs_attention", "archived"].includes(sectionRaw) ? sectionRaw as "drafts" | "processing" | "published" | "needs_attention" | "archived" : undefined;
      const sort = ["newest", "oldest", "most_views", "most_engagement"].includes(sortRaw) ? sortRaw as "newest" | "oldest" | "most_views" | "most_engagement" : "newest";
      sendJson(res, 200, { items: await service.listStudio(requireUserId(req), { section, sort }) });
    },
    async getStudioAnalytics(req, res) {
      sendJson(res, 200, { analytics: await service.getCreatorStudioAnalytics(requireUserId(req)) });
    },
    async listFeed(req, res, query) {
      const limit = Number.parseInt(query.get("limit") ?? "10", 10);
      const cursor = query.get("cursor") ?? undefined;
      const rawScope = String(query.get("scope") ?? "local");
      const scope = rawScope === "regional" || rawScope === "global" ? rawScope : "local";
      const lat = query.get("lat");
      const lng = query.get("lng");
      const city = query.get("city") ?? undefined;
      const region = query.get("region") ?? undefined;
      const viewerUserId = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, await service.listFeed({
        scope,
        limit,
        cursor,
        context: {
          lat: lat ? Number(lat) : undefined,
          lng: lng ? Number(lng) : undefined,
          city,
          region
        },
        userId: viewerUserId
      }));
    },
    async archiveDraft(req, res, videoId) {
      const userId = requireUserId(req);
      const video = await service.archiveVideo({ userId, videoId });
      sendJson(res, 200, { video });
    },
    async trackEvent(req, res, videoId) {
      const body = await parseJsonBody(req) as { event?: "video_viewed" | "video_liked" | "video_saved" | "video_shared" | "video_completed"; progressMs?: number };
      if (!body?.event) throw new ValidationError(["event is required"]);
      const uid = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
      sendJson(res, 200, { video: await service.recordVideoEvent({ videoId, event: body.event, userId: uid, progressMs: typeof body.progressMs === "number" ? body.progressMs : undefined }) });
    },
    async likeVideo(req, res, videoId) {
      sendJson(res, 200, await service.likeVideo({ userId: requireUserId(req), videoId }));
    },
    async unlikeVideo(req, res, videoId) {
      sendJson(res, 200, await service.unlikeVideo({ userId: requireUserId(req), videoId }));
    },
    async saveVideo(req, res, videoId) {
      sendJson(res, 200, await service.saveVideo({ userId: requireUserId(req), videoId }));
    },
    async unsaveVideo(req, res, videoId) {
      sendJson(res, 200, await service.unsaveVideo({ userId: requireUserId(req), videoId }));
    },
    async listSavedVideos(req, res, query) {
      const limit = Number.parseInt(query.get("limit") ?? "20", 10);
      const cursor = query.get("cursor") ?? undefined;
      sendJson(res, 200, await service.listSavedVideos(requireUserId(req), { limit, cursor }));
    },
    async listWatchHistory(req, res) {
      sendJson(res, 200, { summary: await service.getReengagementSummary(requireUserId(req)) });
    },
    async listPlaceVideos(_req, res, placeId) {
      sendJson(res, 200, { items: await service.listPlaceVideos(placeId) });
    },
    async listCreatorVideos(_req, res, userId) {
      sendJson(res, 200, { items: await service.listCreatorVideos(userId) });
    }
  };
}
