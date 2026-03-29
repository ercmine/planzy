import { RetentionPolicy } from "../../retention/policy.js";
import { ValidationError } from "../../plans/errors.js";
import { decodeOffsetCursor, encodeOffsetCursor } from "./store.js";
const LINK_TYPES = ["maps", "website", "call", "booking", "ticket"];
function sortClicks(clicks) {
    return [...clicks].sort((a, b) => {
        if (a.serverAtISO === b.serverAtISO) {
            return a.clickId.localeCompare(b.clickId);
        }
        return a.serverAtISO.localeCompare(b.serverAtISO);
    });
}
function emptyAggregate() {
    return {
        byLinkType: {
            maps: 0,
            website: 0,
            call: 0,
            booking: 0,
            ticket: 0
        },
        total: 0
    };
}
export class MemoryClickStore {
    clicksBySession = new Map();
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new RetentionPolicy();
    }
    async record(click) {
        const existing = this.clicksBySession.get(click.sessionId) ?? [];
        const next = sortClicks([...existing, click]);
        this.clicksBySession.set(click.sessionId, next);
    }
    async listBySession(sessionId, opts) {
        let offset = 0;
        try {
            offset = decodeOffsetCursor(opts?.cursor);
        }
        catch {
            throw new ValidationError(["cursor must be a valid base64 offset"]);
        }
        const limit = opts?.limit ?? 100;
        const clicks = sortClicks(this.clicksBySession.get(sessionId) ?? []);
        const filtered = clicks.filter((click) => {
            if (opts?.linkType && click.linkType !== opts.linkType) {
                return false;
            }
            if (opts?.planId && click.planId !== opts.planId) {
                return false;
            }
            return true;
        });
        const page = filtered.slice(offset, offset + limit);
        const nextOffset = offset + page.length;
        return {
            clicks: page,
            nextCursor: nextOffset < filtered.length ? encodeOffsetCursor(nextOffset) : null
        };
    }
    async aggregateBySession(sessionId) {
        const aggregate = emptyAggregate();
        const clicks = this.clicksBySession.get(sessionId) ?? [];
        for (const linkType of LINK_TYPES) {
            aggregate.byLinkType[linkType] = clicks.filter((click) => click.linkType === linkType).length;
        }
        aggregate.total = clicks.length;
        return aggregate;
    }
    prune(maxAgeMs = this.retentionPolicy.config.maxTtlByClass.analytics_clicks, now = new Date()) {
        const thresholdMs = now.getTime() - maxAgeMs;
        let removed = 0;
        for (const [sessionId, clicks] of this.clicksBySession.entries()) {
            const kept = clicks.filter((click) => {
                const clickAtMs = Date.parse(click.serverAtISO);
                return Number.isFinite(clickAtMs) && clickAtMs >= thresholdMs;
            });
            removed += clicks.length - kept.length;
            if (kept.length === 0) {
                this.clicksBySession.delete(sessionId);
            }
            else {
                this.clicksBySession.set(sessionId, kept);
            }
        }
        return removed;
    }
}
