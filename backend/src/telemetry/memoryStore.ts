import { ValidationError } from "../plans/errors.js";
import { decodeOffsetCursor, encodeOffsetCursor, type TelemetryStore } from "./store.js";
import type { TelemetryEventName, TelemetryRecord } from "./types.js";

const EVENT_NAMES: TelemetryEventName[] = ["deck_loaded", "card_viewed", "card_opened", "swipe", "outbound_link_clicked"];

function sortRecords(items: TelemetryRecord[]): TelemetryRecord[] {
  return [...items].sort((a, b) => {
    if (a.serverAtISO === b.serverAtISO) {
      return a.telemetryId.localeCompare(b.telemetryId);
    }
    return a.serverAtISO.localeCompare(b.serverAtISO);
  });
}

export class MemoryTelemetryStore implements TelemetryStore {
  private readonly recordsBySession = new Map<string, TelemetryRecord[]>();

  public async record(rec: TelemetryRecord): Promise<void> {
    const existing = this.recordsBySession.get(rec.sessionId) ?? [];
    this.recordsBySession.set(rec.sessionId, sortRecords([...existing, rec]));
  }

  public async listBySession(
    sessionId: string,
    opts?: { limit?: number; cursor?: string | null }
  ): Promise<{ items: TelemetryRecord[]; nextCursor?: string | null }> {
    let offset = 0;
    try {
      offset = decodeOffsetCursor(opts?.cursor);
    } catch {
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

  public async aggregateBySession(sessionId: string): Promise<{
    countsByEvent: Record<TelemetryEventName, number>;
    swipes: { yes: number; no: number; maybe: number };
    outboundByLinkType: Record<string, number>;
  }> {
    const records = this.recordsBySession.get(sessionId) ?? [];

    const countsByEvent = EVENT_NAMES.reduce<Record<TelemetryEventName, number>>((acc, eventName) => {
      acc[eventName] = 0;
      return acc;
    }, {} as Record<TelemetryEventName, number>);

    const swipes = { yes: 0, no: 0, maybe: 0 };
    const outboundByLinkType: Record<string, number> = {};

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
