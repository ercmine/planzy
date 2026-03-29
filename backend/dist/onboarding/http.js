import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createOnboardingHttpHandlers(service) {
    return {
        async getPreferences(req, res) {
            sendJson(res, 200, { preferences: await service.getPreferences(requireUserId(req)) });
        },
        async upsertPreferences(req, res) {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { preferences: await service.updatePreferences(requireUserId(req), body) });
        },
        async bootstrapFeed(req, res) {
            sendJson(res, 200, await service.feedBootstrap(requireUserId(req)));
        }
    };
}
