import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createVideoPlatformHttpHandlers(service) {
    return {
        async createDraft(req, res) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            const video = await service.createDraft({ userId, creatorId: body.creatorId, creatorWallet: body.creatorWallet, primaryTreeId: body.primaryTreeId, title: body.title, caption: body.caption, tags: body.tags, rating: body.rating });
            sendJson(res, 201, { video });
        },
        async requestUpload(req, res, videoId) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body?.fileName || !body?.contentType || typeof body.sizeBytes !== "number")
                throw new ValidationError(["fileName, contentType, sizeBytes are required"]);
            const uploadSession = await service.requestUploadSession({ userId, videoId, fileName: body.fileName, contentType: body.contentType, sizeBytes: body.sizeBytes });
            sendJson(res, 201, { uploadSession });
        },
        async finalizeUpload(req, res, videoId) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body?.uploadSessionId)
                throw new ValidationError(["uploadSessionId is required"]);
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
            const body = await parseJsonBody(req);
            sendJson(res, 200, { video: await service.updateDraft({ userId, videoId, ...body }) });
        },
        async listStudio(req, res) {
            const query = new URL(req.url ?? "", "http://localhost").searchParams;
            const sectionRaw = String(query.get("section") ?? "").trim();
            const sortRaw = String(query.get("sort") ?? "newest").trim();
            const section = ["drafts", "processing", "published", "needs_attention", "archived"].includes(sectionRaw) ? sectionRaw : undefined;
            const sort = ["newest", "oldest", "most_views", "most_engagement"].includes(sortRaw) ? sortRaw : "newest";
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
            const body = await parseJsonBody(req);
            if (!body?.event)
                throw new ValidationError(["event is required"]);
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
        },
        async reportVideo(req, res, videoId) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body?.reasonCode)
                throw new ValidationError(["reasonCode is required"]);
            sendJson(res, 202, await service.reportVideo({ userId, videoId, reasonCode: body.reasonCode, note: body.note }));
        }
    };
}
