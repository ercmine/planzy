export class MemoryAnalyticsStore {
    events = [];
    dedupe = new Set();
    async insert(events) {
        for (const event of events) {
            this.events.push(event);
            if (event.dedupeKey)
                this.dedupe.add(event.dedupeKey);
        }
    }
    async list() {
        return [...this.events];
    }
    async hasDedupeKey(dedupeKey) {
        return this.dedupe.has(dedupeKey);
    }
}
