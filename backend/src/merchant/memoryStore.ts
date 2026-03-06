import type { MerchantStore } from "./store.js";
import type {
  ListMerchantItemsOptions,
  ListPromotedResult,
  ListSpecialsResult,
  PromoStatus,
  PromotedPlanRecord,
  SpecialRecord,
  SpecialStatus
} from "./types.js";

function encodeOffset(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function decodeOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = Number(decoded);
    if (!Number.isInteger(parsed) || parsed < 0) return 0;
    return parsed;
  } catch {
    return 0;
  }
}

function statusRank(status: PromoStatus | SpecialStatus): number {
  return status === "active" ? 0 : status === "paused" ? 1 : 2;
}

export class MemoryMerchantStore implements MerchantStore {
  private readonly promoted = new Map<string, PromotedPlanRecord>();
  private readonly specials = new Map<string, SpecialRecord>();

  async createPromoted(record: PromotedPlanRecord): Promise<void> {
    this.promoted.set(record.promoId, structuredClone(record));
  }

  async updatePromoted(promoId: string, patch: Partial<PromotedPlanRecord>): Promise<void> {
    const existing = this.promoted.get(promoId);
    if (!existing) return;
    this.promoted.set(promoId, { ...existing, ...structuredClone(patch) });
  }

  async listPromoted(opts?: ListMerchantItemsOptions): Promise<ListPromotedResult> {
    const limit = Math.max(1, Math.min(200, Math.round(opts?.limit ?? 50)));
    const offset = decodeOffset(opts?.cursor);

    const filtered = [...this.promoted.values()].filter((item) => {
      if (opts?.venueId && item.venueId !== opts.venueId) return false;
      if (opts?.status && item.status !== opts.status) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO);
    });

    const items = filtered.slice(offset, offset + limit).map((item) => structuredClone(item));
    const nextOffset = offset + items.length;
    return {
      items,
      nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null
    };
  }

  async getPromoted(promoId: string): Promise<PromotedPlanRecord | null> {
    const found = this.promoted.get(promoId);
    return found ? structuredClone(found) : null;
  }

  async deletePromoted(promoId: string): Promise<void> {
    this.promoted.delete(promoId);
  }

  async createSpecial(record: SpecialRecord): Promise<void> {
    this.specials.set(record.specialId, structuredClone(record));
  }

  async updateSpecial(specialId: string, patch: Partial<SpecialRecord>): Promise<void> {
    const existing = this.specials.get(specialId);
    if (!existing) return;
    this.specials.set(specialId, { ...existing, ...structuredClone(patch) });
  }

  async listSpecials(opts?: ListMerchantItemsOptions): Promise<ListSpecialsResult> {
    const limit = Math.max(1, Math.min(200, Math.round(opts?.limit ?? 50)));
    const offset = decodeOffset(opts?.cursor);

    const filtered = [...this.specials.values()].filter((item) => {
      if (opts?.venueId && item.venueId !== opts.venueId) return false;
      if (opts?.status && item.status !== opts.status) return false;
      return true;
    });

    filtered.sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;

      const aStart = a.startsAtISO ? Date.parse(a.startsAtISO) : Number.POSITIVE_INFINITY;
      const bStart = b.startsAtISO ? Date.parse(b.startsAtISO) : Number.POSITIVE_INFINITY;
      if (aStart !== bStart) return aStart - bStart;

      return Date.parse(b.createdAtISO) - Date.parse(a.createdAtISO);
    });

    const items = filtered.slice(offset, offset + limit).map((item) => structuredClone(item));
    const nextOffset = offset + items.length;

    return {
      items,
      nextCursor: nextOffset < filtered.length ? encodeOffset(nextOffset) : null
    };
  }

  async getSpecial(specialId: string): Promise<SpecialRecord | null> {
    const found = this.specials.get(specialId);
    return found ? structuredClone(found) : null;
  }

  async deleteSpecial(specialId: string): Promise<void> {
    this.specials.delete(specialId);
  }
}
