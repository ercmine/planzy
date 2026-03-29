import { validateSearchPlansInput } from "../plans/validation.js";
function encodeOffset(offset) {
    return Buffer.from(String(offset), "utf8").toString("base64url");
}
function decodeOffset(cursor) {
    if (!cursor)
        return 0;
    try {
        const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
        return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
    }
    catch {
        return 0;
    }
}
export class PromotedProvider {
    service;
    opts;
    name = "promoted";
    constructor(service, opts) {
        this.service = service;
        this.opts = opts;
    }
    async searchPlans(input, ctx) {
        const normalized = validateSearchPlansInput(input);
        const now = new Date(ctx?.config ? new Date().toISOString() : new Date().toISOString());
        const promoted = await this.service.listPromoted({ limit: 200, nowISO: now.toISOString() });
        const filtered = promoted.items
            .filter((item) => {
            if (!normalized.categories || normalized.categories.length === 0)
                return true;
            return normalized.categories.includes(item.plan.category);
        })
            .sort((a, b) => b.priority - a.priority)
            .map((item) => item.plan);
        const maxReturn = this.opts?.maxReturn ?? normalized.limit;
        const offset = decodeOffset(normalized.cursor);
        const plans = filtered.slice(offset, offset + maxReturn);
        const nextOffset = offset + plans.length;
        return {
            plans,
            nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null,
            source: this.name
        };
    }
}
