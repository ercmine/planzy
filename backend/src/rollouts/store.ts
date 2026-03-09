import { randomUUID } from "node:crypto";

import type { RolloutAuditRecord, RolloutDefinition } from "./types.js";

export interface RolloutStore {
  get(featureKey: string): RolloutDefinition | undefined;
  list(): RolloutDefinition[];
  save(definition: RolloutDefinition): RolloutAuditRecord;
  listAudit(limit?: number): RolloutAuditRecord[];
}

export class MemoryRolloutStore implements RolloutStore {
  private readonly definitions = new Map<string, RolloutDefinition>();
  private readonly audit: RolloutAuditRecord[] = [];

  constructor(seed: RolloutDefinition[] = []) {
    for (const item of seed) {
      this.definitions.set(item.featureKey, item);
    }
  }

  get(featureKey: string): RolloutDefinition | undefined {
    return this.definitions.get(featureKey);
  }

  list(): RolloutDefinition[] {
    return [...this.definitions.values()].sort((a, b) => a.featureKey.localeCompare(b.featureKey));
  }

  save(definition: RolloutDefinition): RolloutAuditRecord {
    const previous = this.definitions.get(definition.featureKey);
    this.definitions.set(definition.featureKey, definition);
    const record: RolloutAuditRecord = {
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

  listAudit(limit = 50): RolloutAuditRecord[] {
    return this.audit.slice(0, limit);
  }
}
