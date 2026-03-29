import { ValidationError } from "../plans/errors.js";
import { decodeOffsetCursor, encodeOffsetCursor } from "./store.js";
const EVENT_NAMES = ["deck_loaded", "card_viewed", "card_opened", "swipe", "outbound_link_clicked"];
function sortRecords(items) {
    return [...items].sort((a, b) => {
        if (a.serverAtISO === b.serverAtISO) {
            return a.telemetryId.localeCompare(b.telemetryId);
        }
        return a.serverAtISO.localeCompare(b.serverAtISO);
    });
}
export class MemoryTelemetryStore {
    recordsBySession = new Map();
    async record(rec) {
        const existing = this.recordsBySession.get(rec.sessionId) ?? [];
        this.recordsBySession.set(rec.sessionId, sortRecords([...existing, rec]));
    }
    async listBySession(sessionId, opts) {
        let offset = 0;
        try {
            offset = decodeOffsetCursor(opts?.cursor);
        }
        catch {
            throw new ValidationError(["cursor must be a valid base64 offset"]);
        }
        const limit = Math.max(1, Math.min(200, opts?.limit ?? 100));
        const all = sortRecords(this.recordsBySession.get(sessionId) ?? []);
        const items = all.slice(offset, offset + limit);
        const nextOffset = offset + items.length;
        return {
            items,
            nextCursor: nextOffset < all.length ? encodeOffsetCursor(nextOffset) : null
        };
    }
    async aggregateBySession(sessionId) {
        const records = this.recordsBySession.get(sessionId) ?? [];
        const countsByEvent = EVENT_NAMES.reduce((acc, eventName) => {
            acc[eventName] = 0;
            return acc;
        }, {});
        const swipes = { yes: 0, no: 0, maybe: 0 };
        const outboundByLinkType = {};
        for (const record of records) {
            countsByEvent[record.event] += 1;
            if (record.payload.event === "swipe") {
                swipes[record.payload.action] += 1;
            }
            if (record.payload.event === "outbound_link_clicked") {
                const linkType = record.payload.linkType;
                outboundByLinkType[linkType] = (outboundByLinkType[linkType] ?? 0) + 1;
            }
        }
        return { countsByEvent, swipes, outboundByLinkType };
    }
}
