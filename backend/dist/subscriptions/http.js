import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { AccountType, CancellationMode, EntitlementValueType, UsageWindow } from "./types.js";
function parseAccountType(value) {
    if (!value)
        return AccountType.USER;
    if (value === AccountType.USER || value === AccountType.CREATOR || value === AccountType.BUSINESS) {
        return value;
    }
    throw new ValidationError(["x-account-type must be USER, CREATOR, or BUSINESS"]);
}
function requiredAccountId(req) {
    const accountId = readHeader(req, "x-user-id")?.trim();
    if (!accountId)
        throw new ValidationError(["x-user-id header is required"]);
    return accountId;
}
export function createSubscriptionHttpHandlers(service, policy) {
    async function ensureAccount(req) {
        const accountId = requiredAccountId(req);
        service.ensureAccount(accountId, parseAccountType(readHeader(req, "x-account-type")));
        return accountId;
    }
    return {
        async getCurrentSubscription(req, res) {
            const accountId = await ensureAccount(req);
            sendJson(res, 200, { subscription: service.getSubscription(accountId), summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async getBillingState(req, res) {
            const accountId = await ensureAccount(req);
            sendJson(res, 200, { billingState: service.getBillingState(accountId) });
        },
        async getCurrentEntitlements(req, res) {
            const accountId = await ensureAccount(req);
            sendJson(res, 200, { entitlements: service.getCurrentEntitlements(accountId) });
        },
        async getAvailablePlans(req, res) {
            const accountId = await ensureAccount(req);
            sendJson(res, 200, { plans: service.getAvailablePlansForAccount(accountId) });
        },
        async checkTrialEligibility(req, res) {
            const accountId = await ensureAccount(req);
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const planId = String(url.searchParams.get("planId") ?? "").trim();
            if (!planId)
                throw new ValidationError(["planId query parameter is required"]);
            const account = service.ensureAccount(accountId, parseAccountType(readHeader(req, "x-account-type")));
            sendJson(res, 200, { eligibility: service.canStartTrial({ type: account.accountType, id: account.id }, planId) });
        },
        async previewUpgrade(req, res) {
            const accountId = await ensureAccount(req);
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const targetPlanId = url.searchParams.get("targetPlanId");
            if (!targetPlanId)
                throw new ValidationError(["targetPlanId query parameter is required"]);
            sendJson(res, 200, { preview: await service.previewPlanChange(accountId, targetPlanId) });
        },
        async previewDowngrade(req, res) {
            const accountId = await ensureAccount(req);
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const targetPlanId = url.searchParams.get("targetPlanId");
            if (!targetPlanId)
                throw new ValidationError(["targetPlanId query parameter is required"]);
            sendJson(res, 200, { preview: await service.previewPlanChange(accountId, targetPlanId) });
        },
        async startSubscriptionChange(req, res) {
            const accountId = await ensureAccount(req);
            const body = await parseJsonBody(req);
            if (!body || typeof body !== "object")
                throw new ValidationError(["body must be an object"]);
            const targetPlanId = String(body.targetPlanId ?? "").trim();
            if (!targetPlanId)
                throw new ValidationError(["targetPlanId is required"]);
            sendJson(res, 200, await service.startSubscriptionChange(accountId, targetPlanId));
        },
        async startTrial(req, res) {
            const accountId = await ensureAccount(req);
            const body = await parseJsonBody(req);
            const planId = String(body?.planId ?? "").trim();
            if (!planId)
                throw new ValidationError(["planId is required"]);
            sendJson(res, 200, { subscription: service.startTrial(accountId, planId), summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async markPastDue(req, res) {
            const accountId = await ensureAccount(req);
            service.markPastDue(accountId);
            sendJson(res, 200, { ok: true, summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async enterGracePeriod(req, res) {
            const accountId = await ensureAccount(req);
            const body = await parseJsonBody(req);
            const graceDays = Number(body?.graceDays ?? 3);
            service.enterGracePeriod(accountId, graceDays);
            sendJson(res, 200, { ok: true, summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async cancelSubscription(req, res) {
            const accountId = await ensureAccount(req);
            const body = await parseJsonBody(req).catch(() => undefined);
            const mode = String(body?.mode ?? "period_end");
            if (mode === "immediate") {
                await service.cancelImmediately(accountId);
            }
            else {
                await service.cancelSubscription(accountId);
            }
            sendJson(res, 200, { ok: true, mode: mode === "immediate" ? CancellationMode.IMMEDIATE : CancellationMode.CANCEL_AT_PERIOD_END, summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async resumeSubscription(req, res) {
            const accountId = await ensureAccount(req);
            await service.resumeSubscription(accountId);
            sendJson(res, 200, { ok: true, summary: service.getCurrentSubscriptionSummary(accountId) });
        },
        async getUsageSummary(req, res) {
            const accountId = await ensureAccount(req);
            sendJson(res, 200, { usage: await service.getUsageSummary(accountId) });
        },
        async adminOverrideEntitlement(req, res) {
            const accountId = String(readHeader(req, "x-account-id") ?? "").trim();
            if (!accountId)
                throw new ValidationError(["x-account-id header is required for admin overrides"]);
            const body = await parseJsonBody(req);
            if (!body || typeof body !== "object")
                throw new ValidationError(["body must be object"]);
            const payload = body;
            const key = String(payload.key ?? "");
            const valueType = payload.valueType;
            const value = payload.value;
            if (valueType === EntitlementValueType.BOOLEAN && typeof value !== "boolean")
                throw new ValidationError(["value must be boolean"]);
            if (valueType === EntitlementValueType.INTEGER && (!Number.isFinite(Number(value)) || Number(value) < 0))
                throw new ValidationError(["value must be integer"]);
            if (valueType === EntitlementValueType.STRING && typeof value !== "string")
                throw new ValidationError(["value must be string"]);
            service.applyEntitlementOverride(accountId, {
                key,
                value: valueType === EntitlementValueType.INTEGER ? Number(value) : value,
                reason: String(payload.reason ?? "admin_override"),
                expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : undefined
            });
            sendJson(res, 200, { ok: true });
        },
        async adminGrantTrial(req, res) {
            const accountId = String(readHeader(req, "x-account-id") ?? "").trim();
            const body = await parseJsonBody(req);
            const days = Number(body?.days ?? 14);
            if (!accountId)
                throw new ValidationError(["x-account-id header is required"]);
            if (!Number.isFinite(days) || days <= 0)
                throw new ValidationError(["days must be positive"]);
            service.grantTrial(accountId, Math.floor(days));
            sendJson(res, 200, { ok: true });
        },
        async adminCompPlan(req, res) {
            const accountId = String(readHeader(req, "x-account-id") ?? "").trim();
            const body = await parseJsonBody(req);
            const planId = String(body?.planId ?? "").trim();
            if (!accountId)
                throw new ValidationError(["x-account-id header is required"]);
            if (!planId)
                throw new ValidationError(["planId is required"]);
            service.compPlan(accountId, planId);
            sendJson(res, 200, { ok: true });
        },
        async adminGetState(req, res) {
            const accountId = String(readHeader(req, "x-account-id") ?? "").trim();
            if (!accountId)
                throw new ValidationError(["x-account-id header is required"]);
            sendJson(res, 200, {
                subscription: service.getSubscription(accountId),
                summary: service.getCurrentSubscriptionSummary(accountId),
                entitlements: service.getCurrentEntitlements(accountId),
                usage: await service.getUsageSummary(accountId),
                events: service.getEventHistory(accountId)
            });
        },
        async authorizeAction(req, res) {
            const accountId = await ensureAccount(req);
            const base = `http://${req.headers.host ?? "localhost"}`;
            const url = new URL(req.url ?? "/", base);
            const action = String(url.searchParams.get("action") ?? "");
            sendJson(res, 200, { decision: await policy.can(accountId, action) });
        },
        async recordReviewUsage(accountId) {
            await service.recordUsage(accountId, "text_reviews", UsageWindow.MONTHLY, 1);
        }
    };
}
