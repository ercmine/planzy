import type { AnalyticsEventRecord, AnalyticsStore } from "./types.js";

export class MemoryAnalyticsStore implements AnalyticsStore {
  private readonly events: AnalyticsEventRecord[] = [];
  private readonly dedupe = new Set<string>();

  async insert(events: AnalyticsEventRecord[]): Promise<void> {
    for (const event of events) {
      this.events.push(event);
      if (event.dedupeKey) this.dedupe.add(event.dedupeKey);
    }
  }

  async list(): Promise<AnalyticsEventRecord[]> {
    return [...this.events];
  }

  async hasDedupeKey(dedupeKey: string): Promise<boolean> {
    return this.dedupe.has(dedupeKey);
  }
}
