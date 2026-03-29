import { randomUUID } from "node:crypto";
import { ValidationError } from "../../plans/errors.js";
import { validateListClicksOptions, validateOutboundClickInput } from "./validation.js";
export class ClickTracker {
    store;
    now;
    constructor(store, deps) {
        this.store = store;
        this.now = deps?.now ?? (() => new Date());
    }
    async track(input, ctx) {
        const validated = validateOutboundClickInput(input);
        const serverAtISO = this.now().toISOString();
        let userId = validated.userId;
        if (!userId && ctx?.userId) {
            if (typeof ctx.userId !== "string" || ctx.userId.trim().length === 0 || ctx.userId.trim().length > 120) {
                throw new ValidationError(["ctx.userId must be a non-empty string <= 120 chars"]);
            }
            userId = ctx.userId.trim();
        }
        const record = {
            clickId: randomUUID(),
            sessionId: validated.sessionId,
            planId: validated.planId,
            linkType: validated.linkType,
            serverAtISO,
            ...(validated.atISO !== undefined ? { clientAtISO: validated.atISO } : {}),
            ...(userId !== undefined ? { userId } : {}),
            ...(validated.meta !== undefined ? { meta: validated.meta } : {})
        };
        await this.store.record(record);
        return record;
    }
    async list(sessionId, opts) {
        if (typeof sessionId !== "string" || sessionId.trim().length === 0 || sessionId.trim().length > 120) {
            throw new ValidationError(["sessionId must be a non-empty string <= 120 chars"]);
        }
        const normalized = validateListClicksOptions(opts);
        return this.store.listBySession(sessionId.trim(), normalized);
    }
    async aggregate(sessionId) {
        if (typeof sessionId !== "string" || sessionId.trim().length === 0 || sessionId.trim().length > 120) {
            throw new ValidationError(["sessionId must be a non-empty string <= 120 chars"]);
        }
        return this.store.aggregateBySession(sessionId.trim());
    }
}
