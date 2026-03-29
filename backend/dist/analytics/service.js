import { randomUUID } from "node:crypto";
import { resolveEventCategory } from "./events.js";
import { sanitizeAnalyticsContext, validateAnalyticsEvent } from "./validation.js";
export class AnalyticsService {
    store;
    constructor(store) {
        this.store = store;
    }
    async ingestBatch(context, events) {
        const sanitizedContext = sanitizeAnalyticsContext(context);
        const accepted = [];
        const pendingDedupe = new Set();
        const result = { accepted: 0, rejected: 0, deduped: 0, errors: [] };
        for (let index = 0; index < events.length; index += 1) {
            try {
                const input = validateAnalyticsEvent(events[index]);
                const dedupeKey = input.dedupeKey ?? this.defaultDedupeKey(sanitizedContext, input);
                if (dedupeKey && (pendingDedupe.has(dedupeKey) || await this.store.hasDedupeKey(dedupeKey))) {
                    result.deduped += 1;
                    continue;
                }
                if (dedupeKey)
                    pendingDedupe.add(dedupeKey);
                const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
                accepted.push({
                    id: randomUUID(),
                    ...sanitizedContext,
                    ...input,
                    dedupeKey,
                    eventCategory: resolveEventCategory(input.eventName),
                    occurredAt,
                    receivedAt: new Date().toISOString()
                });
            }
            catch (error) {
                result.rejected += 1;
                result.errors.push({ index, reason: error instanceof Error ? error.message : "invalid_event" });
            }
        }
        if (accepted.length)
            await this.store.insert(accepted);
        result.accepted = accepted.length;
        return result;
    }
    async track(event, context) {
        await this.ingestBatch(context, [event]);
    }
    async listAll() {
        return this.store.list();
    }
    defaultDedupeKey(context, input) {
        if (!context.sessionId && !context.actorUserId)
            return undefined;
        if (["place_card_impression", "video_play_25", "video_play_50", "video_play_75", "video_play_completed"].includes(input.eventName)) {
            return `${input.eventName}:${context.sessionId ?? context.actorUserId}:${input.placeId ?? input.mediaId ?? "na"}`;
        }
        return undefined;
    }
}
