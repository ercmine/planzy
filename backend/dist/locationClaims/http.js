import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUser(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id is required"]);
    return userId;
}
export function createLocationClaimsHttpHandlers(service) {
    return {
        nearby: async (req, res, url) => {
            const userId = requireUser(req);
            const lat = Number(url.searchParams.get("lat") ?? "0");
            const lng = Number(url.searchParams.get("lng") ?? "0");
            sendJson(res, 200, { locations: service.listNearbyClaimables({ userId, lat, lng }) });
        },
        registerVisit: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, {
                visit: service.registerVisit({
                    userId: requireUser(req),
                    locationId: String(body.locationId ?? ""),
                    lat: Number(body.lat ?? 0),
                    lng: Number(body.lng ?? 0),
                    accuracyMeters: Number(body.accuracyMeters ?? 0)
                })
            });
        },
        prepareClaim: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, {
                adGate: service.prepareAdGate({
                    userId: requireUser(req),
                    locationId: String(body.locationId ?? ""),
                    visitId: String(body.visitId ?? "")
                })
            });
        },
        completeAd: async (_req, res, adSessionId) => sendJson(res, 200, { adGate: service.markAdCompleted(adSessionId) }),
        finalizeClaim: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, {
                claim: service.finalizeClaim({
                    userId: requireUser(req),
                    locationId: String(body.locationId ?? ""),
                    visitId: String(body.visitId ?? ""),
                    adSessionId: String(body.adSessionId ?? ""),
                    idempotencyKey: String(body.idempotencyKey ?? "")
                })
            });
        },
        history: async (req, res) => sendJson(res, 200, { claims: service.getUserHistory(requireUser(req)) }),
        pool: async (_req, res, url) => {
            const year = Number(url.searchParams.get("year") ?? new Date().getUTCFullYear());
            sendJson(res, 200, { pool: service.getPoolStats(year) });
        }
    };
}
