import { randomUUID } from "node:crypto";

import type { ClickTracker } from "../analytics/clicks/clickTracker.js";
import { ValidationError } from "../plans/errors.js";
import type { TelemetryStore } from "./store.js";
import type { IngestResult, TelemetryRecord } from "./types.js";
import { validateTelemetryEventInput } from "./validation.js";

function normalizeSessionId(sessionId: string): string {
  if (typeof sessionId !== "string" || sessionId.trim().length === 0 || sessionId.trim().length > 120) {
    throw new ValidationError(["sessionId must be a non-empty string <= 120 chars"]);
  }
  return sessionId.trim();
}

export class TelemetryService {
  private readonly store: TelemetryStore;
  private readonly now: () => Date;
  private readonly clickTracker?: ClickTracker;

  constructor(store: TelemetryStore, deps?: { now?: () => Date; clickTracker?: ClickTracker }) {
    this.store = store;
    this.now = deps?.now ?? (() => new Date());
    this.clickTracker = deps?.clickTracker;
  }

  public async ingestBatch(
    sessionId: string,
    body: unknown,
    ctx?: { userId?: string; requestId?: string }
  ): Promise<IngestResult> {
    const normalizedSessionId = normalizeSessionId(sessionId);

    if (!Array.isArray(body)) {
      throw new ValidationError(["events must be an array"]);
    }

    let accepted = 0;
    let rejected = 0;
    const errors: Array<{ index: number; reason: string }> = [];

    for (let index = 0; index < body.length; index += 1) {
      const input = body[index];
      try {
        const event = validateTelemetryEventInput(input, normalizedSessionId);
        const record: TelemetryRecord = {
          telemetryId: randomUUID(),
          sessionId: normalizedSessionId,
          event: event.event,
          serverAtISO: this.now().toISOString(),
          payload: event,
          ...(event.clientAtISO !== undefined ? { clientAtISO: event.clientAtISO } : {}),
          ...(ctx?.userId ? { userId: ctx.userId } : {}),
          ...(ctx?.requestId ? { requestId: ctx.requestId } : {})
        };

        await this.store.record(record);

        if (event.event === "outbound_link_clicked" && this.clickTracker) {
          await this.clickTracker.track(
            {
              sessionId: normalizedSessionId,
              planId: event.planId,
              linkType: event.linkType,
              ...(event.clientAtISO !== undefined ? { atISO: event.clientAtISO } : {}),
              meta: { source: "telemetry" }
            },
            { userId: ctx?.userId }
          );
        }

        accepted += 1;
      } catch (error) {
        rejected += 1;
        const reason = error instanceof ValidationError ? error.details.join("; ") : "invalid telemetry event";
        errors.push({ index, reason });
      }
    }

    return {
      accepted,
      rejected,
      ...(errors.length > 0 ? { errors } : {})
    };
  }

  public async list(sessionId: string, opts?: { limit?: number; cursor?: string | null }) {
    return this.store.listBySession(normalizeSessionId(sessionId), opts);
  }

  public async aggregate(sessionId: string) {
    return this.store.aggregateBySession(normalizeSessionId(sessionId));
  }
}
