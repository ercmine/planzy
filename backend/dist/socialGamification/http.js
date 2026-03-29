import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id header required"]);
    return userId;
}
function requireAdmin(req) {
    const userId = readHeader(req, "x-admin-user-id");
    if (!userId)
        throw new ValidationError(["x-admin-user-id header required"]);
}
export function createSocialGamificationHttpHandlers(service) {
    return {
        feed: async (req, res, url) => {
            const userId = requireUserId(req);
            sendJson(res, 200, service.getFeed(userId, url.searchParams.get("cityId") ?? undefined));
        },
        privacy: async (req, res) => {
            const userId = requireUserId(req);
            sendJson(res, 200, service.getPrivacy(userId));
        },
        updatePrivacy: async (req, res) => {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            sendJson(res, 200, service.setPrivacy({
                userId,
                allowChallengeInvites: payload.allowChallengeInvites ?? true,
                allowCompetition: payload.allowCompetition ?? true,
                defaultShareVisibility: payload.defaultShareVisibility ?? "followers"
            }));
        },
        recordAction: async (req, res) => {
            const userId = requireUserId(req);
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const eventId = String(payload.eventId ?? "");
            const type = String(payload.type ?? "");
            if (!eventId || !type)
                throw new ValidationError(["eventId and type are required"]);
            const event = {
                eventId,
                actorUserId: userId,
                type: type,
                canonicalPlaceId: payload.canonicalPlaceId == null ? undefined : String(payload.canonicalPlaceId),
                cityId: payload.cityId == null ? undefined : String(payload.cityId),
                neighborhoodId: payload.neighborhoodId == null ? undefined : String(payload.neighborhoodId),
                categoryIds: Array.isArray(payload.categoryIds) ? payload.categoryIds.map((item) => String(item)) : [],
                contentState: payload.contentState == null ? undefined : String(payload.contentState),
                trustScore: typeof payload.trustScore === "number" ? payload.trustScore : undefined,
                suspicious: payload.suspicious === true,
                occurredAt: payload.occurredAt == null ? undefined : String(payload.occurredAt)
            };
            sendJson(res, 200, await service.recordAction(event));
        },
        upsertGoal: async (req, res) => {
            requireAdmin(req);
            const body = await parseJsonBody(req);
            if (typeof body !== "object" || body === null)
                throw new ValidationError(["goal payload required"]);
            sendJson(res, 200, service.upsertGoal(body));
        }
    };
}
