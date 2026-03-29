function key(type, window, scopeKey) {
    return `${type}:${window}:${scopeKey ?? "global"}`;
}
export class MemoryLeaderboardsStore {
    events = new Map();
    snapshots = new Map();
    formulas = new Map();
    appendEvent(event) {
        this.events.set(event.eventId, event);
    }
    hasEvent(eventId) {
        return this.events.has(eventId);
    }
    listEvents() {
        return [...this.events.values()];
    }
    saveSnapshots(type, window, scopeKey, rows) {
        this.snapshots.set(key(type, window, scopeKey), rows);
    }
    getSnapshots(type, window, scopeKey) {
        return this.snapshots.get(key(type, window, scopeKey)) ?? [];
    }
    saveFormula(type, formula) {
        this.formulas.set(type, formula);
    }
    getFormula(type) {
        return this.formulas.get(type);
    }
}
