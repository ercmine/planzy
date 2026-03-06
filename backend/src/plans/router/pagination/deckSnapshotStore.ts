import { randomUUID } from "node:crypto";

import type { RetentionPolicy } from "../../../retention/policy.js";
import { RetentionPolicy as DefaultRetentionPolicy } from "../../../retention/policy.js";

const MAX_KEY_LENGTH = 120;
const SAFE_SESSION_ID = /[^a-zA-Z0-9_-]/g;

export interface DeckSnapshot {
  deckKey: string;
  planIds: string[];
  storedAtMs: number;
  ttlMs: number;
}

export class MemoryDeckSnapshotStore {
  private readonly snapshots = new Map<string, DeckSnapshot>();
  private readonly retentionPolicy: RetentionPolicy;

  constructor(retentionPolicy?: RetentionPolicy) {
    this.retentionPolicy = retentionPolicy ?? new DefaultRetentionPolicy();
  }

  public get(deckKey: string, nowMs: number): DeckSnapshot | null {
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

  public set(deckKey: string, planIds: string[], nowMs: number, ttlMs: number): void {
    this.evictExpired(nowMs);
    const effectiveTtlMs = this.retentionPolicy.clampTtl("pagination_snapshot", ttlMs);
    this.snapshots.set(deckKey, {
      deckKey,
      planIds: [...planIds],
      storedAtMs: nowMs,
      ttlMs: effectiveTtlMs
    });
  }

  public createKey(sessionId?: string): string {
    const uuid = randomUUID();
    if (!sessionId) {
      return uuid.slice(0, MAX_KEY_LENGTH);
    }

    const sanitized = sessionId.replace(SAFE_SESSION_ID, "").slice(0, 20);
    const prefix = sanitized.length > 0 ? `s-${sanitized}` : "s";
    return `${prefix}-${uuid}`.slice(0, MAX_KEY_LENGTH);
  }

  private evictExpired(nowMs: number): void {
    for (const [key, snapshot] of this.snapshots.entries()) {
      if (snapshot.storedAtMs + snapshot.ttlMs <= nowMs) {
        this.snapshots.delete(key);
      }
    }
  }
}
