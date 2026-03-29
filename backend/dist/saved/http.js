import { ProfileType } from "../accounts/types.js";
import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createSavedHttpHandlers(service) {
    async function savePlace(req, res) {
        const userId = requireUserId(req);
        const body = await parseJsonBody(req);
        const placeId = String(body?.placeId ?? "").trim();
        if (!placeId)
            throw new ValidationError(["placeId is required"]);
        const result = await service.savePlace({ userId, profileType: ProfileType.PERSONAL, profileId: userId, placeId, source: String(body?.source ?? "") || undefined });
        if ("error" in result) {
            sendJson(res, 403, result);
            return;
        }
        sendJson(res, 200, result);
    }
    async function unsavePlace(req, res, placeId) {
        await service.unsavePlace(requireUserId(req), placeId);
        sendJson(res, 200, { ok: true });
    }
    async function listSaved(req, res) {
        sendJson(res, 200, await service.listSaved(requireUserId(req)));
    }
    async function createList(req, res) {
        const userId = requireUserId(req);
        const body = await parseJsonBody(req);
        if (!body?.title?.trim())
            throw new ValidationError(["title is required"]);
        const result = await service.createList({
            userId,
            profileType: ProfileType.PERSONAL,
            profileId: userId,
            title: body.title.trim(),
            description: body.description,
            visibility: body.visibility ?? "private"
        });
        if ("error" in result) {
            sendJson(res, 403, result);
            return;
        }
        sendJson(res, 201, result);
    }
    async function updateList(req, res, listId) {
        const userId = requireUserId(req);
        const body = await parseJsonBody(req);
        const result = await service.updateList(userId, listId, body);
        if ("error" in result) {
            sendJson(res, 404, result);
            return;
        }
        sendJson(res, 200, result);
    }
    async function getList(req, res, listId) {
        const viewer = String(readHeader(req, "x-user-id") ?? "").trim() || undefined;
        const result = await service.getList(viewer, listId);
        if (!result) {
            sendJson(res, 404, { error: "list_not_found" });
            return;
        }
        sendJson(res, 200, result);
    }
    async function addPlaceToList(req, res, listId) {
        const userId = requireUserId(req);
        const body = await parseJsonBody(req);
        if (!body?.placeId?.trim())
            throw new ValidationError(["placeId is required"]);
        const result = await service.addToList({ userId, listId, placeId: body.placeId.trim(), addedBy: userId });
        if ("error" in result) {
            sendJson(res, result.error === "list_not_found" ? 404 : 403, result);
            return;
        }
        sendJson(res, 200, result);
    }
    async function removePlaceFromList(req, res, listId, placeId) {
        const result = await service.removeFromList(requireUserId(req), listId, placeId);
        if ("error" in result) {
            sendJson(res, 404, result);
            return;
        }
        sendJson(res, 200, result);
    }
    async function listPublicByUser(_req, res, userId) {
        sendJson(res, 200, { lists: await service.listPublicByUser(userId) });
    }
    return { savePlace, unsavePlace, listSaved, createList, updateList, getList, addPlaceToList, removePlaceFromList, listPublicByUser };
}
