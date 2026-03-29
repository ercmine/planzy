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
    if (["CREATOR_NOT_FOUND"].includes(code))
        return sendJson(res, 404, { error: code });
    if (["FORBIDDEN", "CREATOR_ENTITLEMENT_REQUIRED"].includes(code))
        return sendJson(res, 403, { error: code });
    if (["CREATOR_QUOTA_EXCEEDED"].includes(code))
        return sendJson(res, 429, { error: code });
    if (error instanceof ValidationError)
        return sendJson(res, 400, { error: error.message, details: error.details });
    throw error;
}
export function createCreatorPremiumHttpHandlers(service) {
    return {
        async premiumState(_req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { state: service.getCreatorPremiumState(creatorProfileId) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async analyticsOverview(req, res, creatorProfileId) {
            try {
                const uid = userId(req);
                const state = service.getCreatorPremiumState(creatorProfileId);
                if (!state)
                    throw new Error("CREATOR_NOT_FOUND");
                if (!service.canAccessAdvancedCreatorAnalytics(creatorProfileId))
                    throw new Error("CREATOR_ENTITLEMENT_REQUIRED");
                sendJson(res, 200, { overview: service.getCreatorAnalyticsOverview(creatorProfileId), requestedBy: uid });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async analyticsAudience(_req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { audience: service.getCreatorAudienceBreakdown(creatorProfileId) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async trackAnalytics(req, res, creatorProfileId) {
            try {
                await parseJsonBody(req).then((payload) => service.recordAnalyticsEvent({ creatorProfileId, ...payload }));
                sendJson(res, 202, { accepted: true });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async quotaState(_req, res, creatorProfileId, feature) {
            try {
                sendJson(res, 200, { quota: service.getCreatorQuota(creatorProfileId, feature) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async consumeQuota(_req, res, creatorProfileId, feature) {
            try {
                sendJson(res, 200, { quota: service.consumeQuota(creatorProfileId, feature) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async discoverability(req, res, creatorProfileId) {
            try {
                const query = new URL(req.url ?? "", "http://localhost").searchParams;
                const decision = service.getCreatorDiscoverabilityEligibility(creatorProfileId, {
                    trustScore: Number(query.get("trustScore") ?? "0.7"),
                    moderationHealthy: String(query.get("moderationHealthy") ?? "true") !== "false",
                    profileCompleteness: Number(query.get("profileCompleteness") ?? "0.8"),
                    relevanceScore: Number(query.get("relevanceScore") ?? "0.8")
                });
                sendJson(res, 200, { decision });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async updateBranding(req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { branding: service.updateCreatorBranding(userId(req), creatorProfileId, await parseJsonBody(req)) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async updateMonetization(req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { monetization: service.updateCreatorMonetizationSettings(userId(req), creatorProfileId, await parseJsonBody(req)) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async upgradeContext(_req, res, creatorProfileId) {
            try {
                sendJson(res, 200, { upgrade: service.getCreatorUpgradeContext(creatorProfileId) });
            }
            catch (error) {
                mapError(res, error);
            }
        }
    };
}
