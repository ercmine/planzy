import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id header required"]);
    return userId;
}
function requireAdminId(req) {
    const adminId = readHeader(req, "x-admin-id");
    if (!adminId)
        throw new ValidationError(["x-admin-id header required"]);
    return adminId;
}
export function createGamificationControlHttpHandlers(service) {
    return {
        summary: async (req, res) => {
            sendJson(res, 200, service.getProgressionSummary(requireUserId(req)));
        },
        processEvent: async (req, res) => {
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const event = {
                eventId: String(payload.eventId ?? ""),
                dedupeKey: payload.dedupeKey == null ? undefined : String(payload.dedupeKey),
                userId: requireUserId(req),
                actionType: String(payload.actionType ?? ""),
                occurredAt: String(payload.occurredAt ?? new Date().toISOString()),
                canonicalPlaceId: payload.canonicalPlaceId == null ? undefined : String(payload.canonicalPlaceId),
                cityId: payload.cityId == null ? undefined : String(payload.cityId),
                categoryId: payload.categoryId == null ? undefined : String(payload.categoryId),
                trustScore: Number(payload.trustScore ?? 0),
                moderationState: payload.moderationState == null ? undefined : String(payload.moderationState),
                qualityScore: typeof payload.qualityScore === "number" ? payload.qualityScore : undefined,
                source: "app"
            };
            if (!event.eventId || !event.actionType)
                throw new ValidationError(["eventId and actionType are required"]);
            sendJson(res, 200, service.processEvent(event));
        },
        createDraft: async (req, res) => {
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            sendJson(res, 200, service.createDraft(requireAdminId(req), payload.notes == null ? undefined : String(payload.notes)));
        },
        publish: async (req, res) => {
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            sendJson(res, 200, service.publishRuleVersion(String(payload.ruleVersionId ?? ""), requireAdminId(req), payload.effectiveFrom == null ? undefined : String(payload.effectiveFrom)));
        },
        recompute: async (req, res) => {
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            const userId = String(payload.userId ?? "");
            if (!userId)
                throw new ValidationError(["userId is required"]);
            service.recomputeUser(userId, requireAdminId(req));
            sendJson(res, 200, { ok: true });
        },
        adminSnapshot: async (_req, res) => {
            sendJson(res, 200, service.getAdminSnapshot());
        },
        explainDecision: async (req, res) => {
            const body = await parseJsonBody(req);
            const payload = (typeof body === "object" && body !== null ? body : {});
            sendJson(res, 200, { decision: service.explainDecision(String(payload.decisionId ?? "")) });
        }
    };
}
