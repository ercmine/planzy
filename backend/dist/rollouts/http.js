import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function listHeader(req, name) {
    const raw = String(readHeader(req, name) ?? "").trim();
    if (!raw)
        return [];
    return raw.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
function getContext(req, rolloutService, featureKey) {
    return rolloutService.resolveContext({
        featureKey,
        userId: String(readHeader(req, "x-user-id") ?? "").trim() || undefined,
        market: String(readHeader(req, "x-market") ?? readHeader(req, "x-region") ?? "").trim() || undefined,
        cohorts: listHeader(req, "x-cohorts"),
        accountType: (() => {
            const raw = String(readHeader(req, "x-account-type") ?? "").trim().toLowerCase();
            return raw ? raw : undefined;
        })(),
    });
}
export function createRolloutHttpHandlers(rolloutService) {
    return {
        summary: async (req, res) => {
            const context = getContext(req, rolloutService, "summary");
            sendJson(res, 200, {
                environment: context.environment,
                context: {
                    userId: context.userId,
                    market: context.market,
                    cohorts: context.cohorts,
                    accountType: context.accountType,
                    planFamily: context.planFamily
                },
                features: rolloutService.getRolloutSummaryForPrincipal({
                    environment: context.environment,
                    userId: context.userId,
                    targetType: context.targetType,
                    targetId: context.targetId,
                    market: context.market,
                    cohorts: context.cohorts,
                    accountType: context.accountType,
                    planFamily: context.planFamily,
                    roles: context.roles,
                    activeProfileType: context.activeProfileType
                })
            });
        },
        evaluate: async (req, res, featureKey) => {
            const context = getContext(req, rolloutService, featureKey);
            sendJson(res, 200, rolloutService.evaluate(featureKey, context));
        },
        adminList: async (_req, res) => {
            sendJson(res, 200, { items: rolloutService.listDefinitions() });
        },
        adminUpsert: async (req, res) => {
            const body = await parseJsonBody(req);
            const changedBy = String(readHeader(req, "x-admin-id") ?? readHeader(req, "x-user-id") ?? "system");
            const saved = rolloutService.updateDefinition({ ...body, updatedBy: changedBy });
            sendJson(res, 200, saved);
        },
        adminAudit: async (req, res) => {
            const limitRaw = Number(String(readHeader(req, "x-limit") ?? "50"));
            sendJson(res, 200, { items: rolloutService.listAudit(Number.isFinite(limitRaw) ? limitRaw : 50) });
        }
    };
}
