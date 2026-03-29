import { randomUUID } from "node:crypto";
import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";
const MAX_KEY_LENGTH = 120;
const SAFE_SESSION_ID = /[^a-zA-Z0-9_-]/g;
export class MemoryDeckSnapshotStore {
    snapshots = new Map();
    retentionPolicy;
    constructor(retentionPolicy) {
        this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
    }
    get(deckKey, nowMs) {
        this.evictExpired(nowMs);
        const snapshot = this.snapshots.get(deckKey);
        if (!snapshot) {
            return null;
        }
        if (snapshot.storedAtMs + snapshot.ttlMs <= nowMs) {
            this.snapshots.delete(deckKey);
            return null;
        }
        return snapshot;
    }
    set(deckKey, planIds, nowMs, ttlMs) {
        this.evictExpired(nowMs);
        const effectiveTtlMs = this.retentionPolicy.clampTtl("pagination_snapshot", ttlMs);
        this.snapshots.set(deckKey, {
            deckKey,
            planIds: [...planIds],
            storedAtMs: nowMs,
            ttlMs: effectiveTtlMs
        });
    }
    createKey(sessionId) {
        const uuid = randomUUID();
        if (!sessionId) {
            return uuid.slice(0, MAX_KEY_LENGTH);
        }
        const sanitized = sessionId.replace(SAFE_SESSION_ID, "").slice(0, 20);
        const prefix = sanitized.length > 0 ? `s-${sanitized}` : "s";
        return `${prefix}-${uuid}`.slice(0, MAX_KEY_LENGTH);
    }
    evictExpired(nowMs) {
        for (const [key, snapshot] of this.snapshots.entries()) {
            if (snapshot.storedAtMs + snapshot.ttlMs <= nowMs) {
                this.snapshots.delete(key);
            }
        }
    }
}
