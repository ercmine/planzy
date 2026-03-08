import type { UsageCounter, UsageMetric, UsageWindow } from "./types.js";

export interface UsageStore {
  get(accountId: string, metric: UsageMetric, window: UsageWindow, periodKey?: string): Promise<number>;
  increment(accountId: string, metric: UsageMetric, window: UsageWindow, amount?: number, periodKey?: string): Promise<void>;
  listByAccount(accountId: string): Promise<UsageCounter[]>;
}

export class MemoryUsageStore implements UsageStore {
  private readonly store = new Map<string, number>();

  async get(accountId: string, metric: UsageMetric, window: UsageWindow, periodKey = currentPeriodKey()): Promise<number> {
    return this.store.get(key(accountId, metric, window, periodKey)) ?? 0;
  }

  async increment(accountId: string, metric: UsageMetric, window: UsageWindow, amount = 1, periodKey = currentPeriodKey()): Promise<void> {
    const id = key(accountId, metric, window, periodKey);
    this.store.set(id, (this.store.get(id) ?? 0) + amount);
  }

  async listByAccount(accountId: string): Promise<UsageCounter[]> {
    const rows: UsageCounter[] = [];
    for (const [compound, value] of this.store.entries()) {
      const [rowAccountId, metric, window, periodKey] = compound.split("|");
      if (rowAccountId !== accountId) continue;
      rows.push({ accountId: rowAccountId, metric: metric as UsageMetric, window: window as UsageWindow, periodKey, value });
    }
    return rows;
  }
}

export function currentPeriodKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function key(accountId: string, metric: UsageMetric, window: UsageWindow, periodKey: string): string {
  return `${accountId}|${metric}|${window}|${periodKey}`;
}
