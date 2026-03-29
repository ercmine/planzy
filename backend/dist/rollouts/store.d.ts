import type { RolloutAuditRecord, RolloutDefinition } from "./types.js";
export interface RolloutStore {
    get(featureKey: string): RolloutDefinition | undefined;
    list(): RolloutDefinition[];
    save(definition: RolloutDefinition): RolloutAuditRecord;
    listAudit(limit?: number): RolloutAuditRecord[];
}
export declare class MemoryRolloutStore implements RolloutStore {
    private readonly definitions;
    private readonly audit;
    constructor(seed?: RolloutDefinition[]);
    get(featureKey: string): RolloutDefinition | undefined;
    list(): RolloutDefinition[];
    save(definition: RolloutDefinition): RolloutAuditRecord;
    listAudit(limit?: number): RolloutAuditRecord[];
}
