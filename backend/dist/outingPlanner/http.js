import { ValidationError } from "../plans/errors.js";
import { ROLLOUT_FEATURE_KEYS } from "../rollouts/featureKeys.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createOutingPlannerHandlers(service, rolloutService) {
    const assertRollout = (req) => {
        if (!rolloutService)
            return;
        const userId = requireUserId(req);
        const cohorts = String(readHeader(req, "x-cohorts") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
        const context = rolloutService.resolveContext({
            featureKey: ROLLOUT_FEATURE_KEYS.AI_ITINERARY,
            userId,
            market: String(readHeader(req, "x-market") ?? "").trim() || undefined,
            cohorts
        });
        rolloutService.assertFeatureRolledOut(ROLLOUT_FEATURE_KEYS.AI_ITINERARY, context);
    };
    return {
        createPlan: async (req, res) => {
            assertRollout(req);
            const body = await parseJsonBody(req);
            sendJson(res, 200, await service.createOutingPlan(requireUserId(req), body));
        },
        savePlan: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.generated)
                throw new ValidationError(["generated itinerary is required"]);
            const result = await service.saveOutingPlan(requireUserId(req), body.generated, body.title);
            sendJson(res, "error" in result ? 403 : 201, result);
        },
        listSaved: async (req, res) => {
            sendJson(res, 200, { items: await service.listSavedItineraries(requireUserId(req)) });
        },
        getSaved: async (req, res, itineraryId) => {
            sendJson(res, 200, await service.getSavedItinerary(requireUserId(req), itineraryId));
        },
        patchSaved: async (req, res, itineraryId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, await service.updateSavedItinerary(requireUserId(req), itineraryId, body));
        },
        regenerate: async (req, res) => {
            assertRollout(req);
            const body = await parseJsonBody(req);
            const result = await service.regenerateItinerary(requireUserId(req), body);
            sendJson(res, "error" in result ? 403 : 200, result);
        },
        deleteSaved: async (req, res, itineraryId) => {
            sendJson(res, 200, await service.deleteSavedItinerary(requireUserId(req), itineraryId));
        },
        usage: async (req, res) => {
            sendJson(res, 200, await service.getItineraryUsageLimits(requireUserId(req)));
        }
    };
}
