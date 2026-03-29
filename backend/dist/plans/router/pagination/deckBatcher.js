import { ValidationError } from "../../errors.js";
import { decodeCursor, encodeCursor, validateCursor } from "./cursor.js";
import { MemoryDeckSnapshotStore } from "./deckSnapshotStore.js";
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_BATCH_SIZE = 100;
const DEFAULT_CURSOR_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_SNAPSHOT_TTL_MS = 10 * 60 * 1000;
const DEFAULT_MAX_OFFSET = 5_000;
export class DeckBatcher {
    opts;
    snapshotEnabledOverride;
    store;
    now;
    constructor(opts, deps) {
        this.opts = {
            defaultBatchSize: opts?.defaultBatchSize ?? DEFAULT_BATCH_SIZE,
            maxBatchSize: opts?.maxBatchSize ?? DEFAULT_MAX_BATCH_SIZE,
            cursorMaxAgeMs: opts?.cursorMaxAgeMs ?? DEFAULT_CURSOR_MAX_AGE_MS,
            snapshotTtlMs: opts?.snapshotTtlMs ?? DEFAULT_SNAPSHOT_TTL_MS,
            maxOffset: opts?.maxOffset ?? DEFAULT_MAX_OFFSET
        };
        this.snapshotEnabledOverride = opts?.snapshotEnabled;
        this.store = deps?.store ?? new MemoryDeckSnapshotStore();
        this.now = deps?.now ?? (() => Date.now());
    }
    batch(plans, params) {
        const nowMs = this.now();
        const batchSize = this.resolveBatchSize(params.requestedBatchSize);
        let offset = 0;
        let deckKey;
        let orderedPlans = [...plans];
        if (params.cursor) {
            const decoded = decodeCursor(params.cursor);
            if (!decoded) {
                throw new ValidationError(["cursor is malformed"], "Invalid cursor");
            }
            const validated = validateCursor(decoded, nowMs, {
                maxAgeMs: this.opts.cursorMaxAgeMs,
                maxOffset: this.opts.maxOffset
            });
            offset = validated.offset;
            deckKey = validated.deckKey;
            if (deckKey) {
                const snapshot = this.store.get(deckKey, nowMs);
                if (snapshot) {
                    orderedPlans = this.reorderWithSnapshot(orderedPlans, snapshot.planIds);
                }
            }
        }
        const snapshotEnabled = this.snapshotEnabledOverride !== undefined ? this.snapshotEnabledOverride : params.sessionId !== undefined;
        if (snapshotEnabled && params.sessionId && !deckKey) {
            deckKey = this.store.createKey(params.sessionId);
            this.store.set(deckKey, orderedPlans.map((plan) => plan.id), nowMs, this.opts.snapshotTtlMs);
        }
        const items = orderedPlans.slice(offset, offset + batchSize);
        const nextOffset = offset + items.length;
        const nextCursor = nextOffset < orderedPlans.length && nextOffset <= this.opts.maxOffset
            ? encodeCursor({ v: 2, offset: nextOffset, batchSize, deckKey, createdAtMs: nowMs })
            : null;
        return { items, nextCursor, deckKey };
    }
    resolveBatchSize(requestedBatchSize) {
        const candidate = requestedBatchSize ?? this.opts.defaultBatchSize;
        if (!Number.isFinite(candidate)) {
            return this.opts.defaultBatchSize;
        }
        return Math.max(1, Math.min(this.opts.maxBatchSize, Math.round(candidate)));
    }
    reorderWithSnapshot(plans, snapshotPlanIds) {
        const currentById = new Map(plans.map((plan) => [plan.id, plan]));
        const ordered = [];
        const seen = new Set();
        for (const planId of snapshotPlanIds) {
            const plan = currentById.get(planId);
            if (plan) {
                ordered.push(plan);
                seen.add(planId);
            }
        }
        for (const plan of plans) {
            if (!seen.has(plan.id)) {
                ordered.push(plan);
            }
        }
        return ordered;
    }
}
