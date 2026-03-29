import { randomUUID } from "node:crypto";
export class MemoryRolloutStore {
    definitions = new Map();
    audit = [];
    constructor(seed = []) {
        for (const item of seed) {
            this.definitions.set(item.featureKey, item);
        }
    }
    get(featureKey) {
        return this.definitions.get(featureKey);
    }
    list() {
        return [...this.definitions.values()].sort((a, b) => a.featureKey.localeCompare(b.featureKey));
    }
    save(definition) {
        const previous = this.definitions.get(definition.featureKey);
        this.definitions.set(definition.featureKey, definition);
        const record = {
            id: `rollout_audit_${randomUUID()}`,
            featureKey: definition.featureKey,
            changedBy: definition.updatedBy,
            changedAt: definition.updatedAt,
            previous,
            next: definition
        };
        this.audit.unshift(record);
        return record;
    }
    listAudit(limit = 50) {
        return this.audit.slice(0, limit);
    }
}
