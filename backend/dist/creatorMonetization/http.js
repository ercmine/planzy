import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function userId(req) {
    const id = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!id)
        throw new ValidationError(["x-user-id header is required"]);
    return id;
}
function mapError(res, error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (["CREATOR_NOT_FOUND", "GUIDE_NOT_FOUND"].includes(code))
        return sendJson(res, 404, { error: code });
    if (["FORBIDDEN", "CREATOR_TIPPING_NOT_ELIGIBLE", "CREATOR_PREMIUM_NOT_ELIGIBLE", "CREATOR_MEMBERSHIP_NOT_ELIGIBLE"].includes(code))
        return sendJson(res, 403, { error: code });
    if (error instanceof ValidationError)
        return sendJson(res, 400, { error: error.message, details: error.details });
    throw error;
}
export function createCreatorMonetizationHttpHandlers(service) {
    return {
        async getProfile(req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { profile: service.getProfile(creatorProfileId), capabilities: service.getCapabilities(creatorProfileId) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async updateSettings(req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { profile: service.updateSettings(userId(req), creatorProfileId, await parseJsonBody(req)) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async createTipIntent(req, res) {
            try {
                sendJson(res, 201, { tipIntent: await service.createTipIntent(userId(req), await parseJsonBody(req)) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async setGuidePremium(req, res, creatorProfileId, guideId) {
            try {
                service.setGuidePremiumMode(userId(req), creatorProfileId, guideId, await parseJsonBody(req));
                sendJson(res, 200, { ok: true });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async createMembershipPlan(req, res, creatorProfileId) {
            try {
                sendJson(res, 201, { plan: service.createMembershipPlan(userId(req), creatorProfileId, await parseJsonBody(req)) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async adminStatus(req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { profile: service.adminUpdateStatus(userId(req), creatorProfileId, await parseJsonBody(req)), audit: service.listAuditLogs(creatorProfileId) });
            }
            catch (error) {
                mapError(res, error);
            }
        }
    };
}
