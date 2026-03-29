import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { evaluateRankingAdjustments } from "./tuning.js";
function assertAdmin(req) {
    const expected = process.env.ADMIN_API_KEY;
    return Boolean(expected) && readHeader(req, "x-admin-key") === expected;
}
function applyDraftOverlay(base, payload, surface) {
    return {
        ...base,
        weights: { ...base.weights, ...payload.weights },
        categoryRules: [...base.categoryRules, ...payload.categoryRules],
        featuredRules: [...base.featuredRules, ...payload.featuredRules],
        trendingRules: { ...base.trendingRules, ...payload.trendingRules },
        sourceRules: [...base.sourceRules, ...payload.sourceRules],
        recommendationRule: payload.recommendationRules.find((rule) => rule.surface === surface) ?? base.recommendationRule
    };
}
export function createRankingTuningHandlers(service, resolver, repo) {
    return {
        async list(_req, res) {
            sendJson(res, 200, { items: service.listConfigSets({ includeDrafts: true }) });
        },
        async createDraft(req, res) {
            const body = await parseJsonBody(req);
            sendJson(res, 201, service.createDraft({ actorId: body.actorId ?? "admin", name: body.name, scopeType: body.scopeType, scopeKey: body.scopeKey, payload: body.payload, notes: body.notes }));
        },
        async updateDraft(req, res, configSetId) {
            const body = await parseJsonBody(req);
            sendJson(res, 200, service.updateDraft({ actorId: body.actorId ?? "admin", configSetId, payload: body.payload, notes: body.notes }));
        },
        async validate(req, res, configSetId) {
            sendJson(res, 200, service.validateDraft(configSetId, String(readHeader(req, "x-user-id") ?? "admin")));
        },
        async publish(req, res, configSetId) {
            const body = await parseJsonBody(req);
            sendJson(res, 200, service.publish({ actorId: body.actorId ?? "admin", configSetId, reason: body.reason }));
        },
        async rollback(req, res) {
            const body = await parseJsonBody(req);
            sendJson(res, 200, service.rollback({ actorId: body.actorId ?? "admin", scopeType: body.scopeType, scopeKey: body.scopeKey, toVersion: body.toVersion, reason: body.reason }));
        },
        async audit(_req, res) {
            sendJson(res, 200, { items: service.listAuditHistory() });
        },
        async preview(req, res) {
            const body = await parseJsonBody(req);
            const context = body.context;
            const published = resolver.resolve({ city: context.city, categoryId: context.categoryId ?? context.categorySlug, surface: context.surface });
            const draft = body.draftConfigSetId ? service.getConfig(body.draftConfigSetId) : undefined;
            const simulatedResolved = draft ? applyDraftOverlay(published, draft.payload, context.surface) : published;
            const places = await repo.listPlaces();
            const scored = places.map((place) => {
                const base = place.qualityScore + place.trendingScore;
                const current = evaluateRankingAdjustments(place, base, published, { city: context.city, categoryId: context.categoryId, surface: context.surface, provider: place.sourceAttribution[0] });
                const simulated = evaluateRankingAdjustments(place, base, simulatedResolved, { city: context.city, categoryId: context.categoryId, surface: context.surface, provider: place.sourceAttribution[0] });
                return { placeId: place.canonicalPlaceId, currentScore: current.score, draftScore: simulated.score, reasons: simulated.reasons };
            }).sort((a, b) => b.draftScore - a.draftScore).slice(0, Number(context.pageSize ?? 20));
            sendJson(res, 200, { items: scored, scope: { city: context.city, categoryId: context.categoryId, surface: context.surface } });
        },
        ensureAdmin(req, res) {
            if (!assertAdmin(req)) {
                sendJson(res, 403, { error: "ADMIN_REQUIRED" });
                return false;
            }
            return true;
        }
    };
}
