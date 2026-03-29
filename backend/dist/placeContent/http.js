import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createPlaceContentHttpHandlers(service) {
    return {
        async createReview(req, res) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body.canonicalPlaceId?.trim())
                throw new ValidationError(["canonicalPlaceId is required"]);
            if (!body.body?.trim())
                throw new ValidationError(["body is required"]);
            const review = await service.createReview({ canonicalPlaceId: body.canonicalPlaceId.trim(), authorUserId: userId, body: body.body.trim(), rating: body.rating });
            sendJson(res, 201, { review });
        },
        async createVideo(req, res) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body.canonicalPlaceId?.trim())
                throw new ValidationError(["canonicalPlaceId is required"]);
            if (!body.mediaAssetId?.trim())
                throw new ValidationError(["mediaAssetId is required"]);
            const video = await service.createCreatorVideo({
                canonicalPlaceId: body.canonicalPlaceId.trim(),
                authorUserId: userId,
                mediaAssetId: body.mediaAssetId.trim(),
                thumbnailAssetId: body.thumbnailAssetId,
                title: body.title,
                caption: body.caption
            });
            sendJson(res, 201, { video });
        },
        async savePlace(req, res) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body.canonicalPlaceId?.trim())
                throw new ValidationError(["canonicalPlaceId is required"]);
            const save = await service.savePlace({ userId, canonicalPlaceId: body.canonicalPlaceId.trim(), sourceContext: body.sourceContext ?? "other" });
            sendJson(res, 200, { save });
        },
        async removeSave(req, res, canonicalPlaceId) {
            await service.unsavePlace(requireUserId(req), canonicalPlaceId);
            sendJson(res, 200, { ok: true });
        },
        async createGuide(req, res) {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body.title?.trim())
                throw new ValidationError(["title is required"]);
            const guide = await service.createGuide({ ownerUserId: userId, title: body.title.trim(), description: body.description, visibility: body.visibility });
            sendJson(res, 201, { guide });
        },
        async addGuidePlace(req, res, guideId) {
            requireUserId(req);
            const body = await parseJsonBody(req);
            if (!body.canonicalPlaceId?.trim())
                throw new ValidationError(["canonicalPlaceId is required"]);
            await service.addGuidePlace({ guideId, canonicalPlaceId: body.canonicalPlaceId.trim(), note: body.note });
            sendJson(res, 200, { ok: true });
        },
        async placeContent(_req, res, canonicalPlaceId) {
            const [content, premium] = await Promise.all([
                service.getPlaceDetailContent(canonicalPlaceId),
                service.getPremiumPlaceDetailContent(canonicalPlaceId)
            ]);
            sendJson(res, 200, { ...content, premium });
        },
        async creatorContent(_req, res, userId) {
            sendJson(res, 200, await service.getCreatorContent(userId));
        }
    };
}
