import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const id = String(readHeader(req, "x-user-id") ?? "").trim();
    if (!id)
        throw new ValidationError(["x-user-id header is required"]);
    return id;
}
function mapError(res, error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (["ANALYTICS_ACCESS_DENIED"].includes(code))
        return sendJson(res, 403, { error: code });
    if (["PLACE_SCOPE_REQUIRED"].includes(code))
        return sendJson(res, 400, { error: code });
    if (error instanceof ValidationError)
        return sendJson(res, 400, { error: error.message, details: error.details });
    throw error;
}
export function createBusinessAnalyticsHttpHandlers(service) {
    return {
        async trackEvent(req, res) {
            try {
                const body = await parseJsonBody(req);
                const event = await service.recordEvent(body);
                sendJson(res, 201, { eventId: event.id });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        async dashboard(req, res, businessProfileId) {
            try {
                const search = new URL(req.url ?? "", "http://localhost").searchParams;
                const placeIds = String(search.get("placeIds") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
                const from = String(search.get("from") ?? "").trim();
                const to = String(search.get("to") ?? "").trim();
                const compareFrom = String(search.get("compareFrom") ?? "").trim() || undefined;
                const compareTo = String(search.get("compareTo") ?? "").trim() || undefined;
                const dashboard = await service.getDashboard(requireUserId(req), {
                    businessProfileId,
                    placeIds,
                    from,
                    to,
                    compareFrom,
                    compareTo,
                    includeCreatorImpact: true
                }, Boolean(readHeader(req, "x-admin-key")));
                sendJson(res, 200, { dashboard });
            }
            catch (error) {
                mapError(res, error);
            }
        }
    };
}
