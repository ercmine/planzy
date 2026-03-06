import type { ClickAggregate, ListClicksOptions, ListClicksResult, OutboundClickRecord } from "./types.js";

export interface ClickStore {
  record(click: OutboundClickRecord): Promise<void>;
  listBySession(sessionId: string, opts?: ListClicksOptions): Promise<ListClicksResult>;
  aggregateBySession(sessionId: string): Promise<ClickAggregate>;
}

export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

export function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }

  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number.parseInt(decoded, 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("invalid cursor");
  }

  return parsed;
}
