import type { TelemetryEventName, TelemetryRecord } from "./types.js";

export interface TelemetryStore {
  record(rec: TelemetryRecord): Promise<void>;
  listBySession(
    sessionId: string,
    opts?: { limit?: number; cursor?: string | null }
  ): Promise<{ items: TelemetryRecord[]; nextCursor?: string | null }>;
  aggregateBySession(sessionId: string): Promise<{
    countsByEvent: Record<TelemetryEventName, number>;
    swipes: { yes: number; no: number; maybe: number };
    outboundByLinkType: Record<string, number>;
  }>;
}

export function encodeOffsetCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

export function decodeOffsetCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number.parseInt(decoded, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("invalid cursor");
  }
  return parsed;
}
