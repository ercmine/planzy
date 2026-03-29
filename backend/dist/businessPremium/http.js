import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
function mapError(res, error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (["FEATURED_PLACEMENT_LOCKED", "ENHANCED_PROFILE_LOCKED", "MULTI_LOCATION_LIMIT_REACHED", "CAMPAIGNS_LOCKED", "CAMPAIGN_LOCATION_NOT_OWNED"].includes(code)) {
        sendJson(res, 403, { error: code });
        return;
    }
    if (["FEATURED_POLICY_DENIED"].includes(code)) {
        sendJson(res, 422, { error: code });
        return;
    }
    if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message, details: error.details });
        return;
    }
    throw error;
}
export function createBusinessPremiumHttpHandlers(service) {
    return {
        async getPremiumState(_req, res, businessId) {
            try {
                const tier = await service.getBusinessTier(businessId);
                const entitlements = await service.getBusinessEntitlements(businessId);
                const upgrade = await service.getBusinessUpgradeContext(businessId);
                sendJson(res, 200, { businessId, tier, entitlements, upgrade });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async setTier(req, res, businessId) {
            try {
                const body = await parseJsonBody(req);
                const state = await service.setBusinessTier(businessId, body.tier);
                sendJson(res, 200, { state });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async updateFeaturedPlacementSettings(req, res, businessId) {
            try {
                const body = await parseJsonBody(req);
                const settings = await service.updateBusinessFeaturedPlacementSettings({ ...body, businessId });
                sendJson(res, 200, { settings });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async updateEnhancedProfile(req, res, businessId) {
            try {
                const body = await parseJsonBody(req);
                const settings = await service.updateBusinessEnhancedProfileSettings({ ...body, businessId });
                sendJson(res, 200, { settings });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async createCampaign(req, res, businessId) {
            try {
                const body = await parseJsonBody(req);
                const campaign = await service.createBusinessCampaign({ ...body, businessId });
                sendJson(res, 201, { campaign });
            }
            catch (error) {
                mapError(res, error);
            }
        }
    };
}
