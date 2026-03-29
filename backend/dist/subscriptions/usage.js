export class MemoryUsageStore {
    store = new Map();
    async get(accountId, metric, window, periodKey = currentPeriodKey()) {
        return this.store.get(key(accountId, metric, window, periodKey)) ?? 0;
    }
    async increment(accountId, metric, window, amount = 1, periodKey = currentPeriodKey()) {
        const id = key(accountId, metric, window, periodKey);
        this.store.set(id, (this.store.get(id) ?? 0) + amount);
    }
    async listByAccount(accountId) {
        const rows = [];
        for (const [compound, value] of this.store.entries()) {
            const [rowAccountId, metric, window, periodKey] = compound.split("|");
            if (rowAccountId !== accountId)
                continue;
            rows.push({ accountId: rowAccountId, metric: metric, window: window, periodKey, value });
        }
        return rows;
    }
}
export function currentPeriodKey(date = new Date()) {
    return date.toISOString().slice(0, 7);
}
function key(accountId, metric, window, periodKey) {
    return `${accountId}|${metric}|${window}|${periodKey}`;
}
