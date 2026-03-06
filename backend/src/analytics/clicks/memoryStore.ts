import { ValidationError } from "../../plans/errors.js";
import type { ClickStore } from "./store.js";
import { decodeOffsetCursor, encodeOffsetCursor } from "./store.js";
import type { ClickAggregate, LinkType, ListClicksOptions, ListClicksResult, OutboundClickRecord } from "./types.js";

const LINK_TYPES: LinkType[] = ["maps", "website", "call", "booking", "ticket"];

function sortClicks(clicks: OutboundClickRecord[]): OutboundClickRecord[] {
  return [...clicks].sort((a, b) => {
    if (a.serverAtISO === b.serverAtISO) {
      return a.clickId.localeCompare(b.clickId);
    }
    return a.serverAtISO.localeCompare(b.serverAtISO);
  });
}

function emptyAggregate(): ClickAggregate {
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

export class MemoryClickStore implements ClickStore {
  private readonly clicksBySession = new Map<string, OutboundClickRecord[]>();

  public async record(click: OutboundClickRecord): Promise<void> {
    const existing = this.clicksBySession.get(click.sessionId) ?? [];
    const next = sortClicks([...existing, click]);
    this.clicksBySession.set(click.sessionId, next);
  }

  public async listBySession(sessionId: string, opts?: ListClicksOptions): Promise<ListClicksResult> {
    let offset = 0;
    try {
      offset = decodeOffsetCursor(opts?.cursor);
    } catch {
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

  public async aggregateBySession(sessionId: string): Promise<ClickAggregate> {
    const aggregate = emptyAggregate();
    const clicks = this.clicksBySession.get(sessionId) ?? [];

    for (const linkType of LINK_TYPES) {
      aggregate.byLinkType[linkType] = clicks.filter((click) => click.linkType === linkType).length;
    }

    aggregate.total = clicks.length;

    return aggregate;
  }
}
