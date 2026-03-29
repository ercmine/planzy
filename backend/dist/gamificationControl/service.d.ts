import type { AnalyticsService } from "../analytics/service.js";
import type { GamificationControlStore } from "./store.js";
import type { AdminAuditLog, GamificationEvent, ProgressionSummaryDto, RewardDecision, RuleVersion } from "./types.js";
export declare class GamificationControlService {
    private readonly store;
    private readonly analyticsService?;
    constructor(store: GamificationControlStore, analyticsService?: AnalyticsService | undefined);
    seedInitialRules(adminId: string): RuleVersion;
    createDraft(adminId: string, notes?: string): RuleVersion;
    updateDraft(ruleVersionId: string, adminId: string, updater: (draft: RuleVersion) => RuleVersion): RuleVersion;
    publishRuleVersion(ruleVersionId: string, adminId: string, effectiveFrom?: string): RuleVersion;
    processEvent(event: GamificationEvent): RewardDecision;
    recomputeUser(userId: string, adminId: string): void;
    explainDecision(decisionId: string): RewardDecision | undefined;
    getProgressionSummary(userId: string): ProgressionSummaryDto;
    getAdminSnapshot(): {
        activeRuleVersion: RuleVersion | null;
        ruleVersions: RuleVersion[];
        adminAudit: AdminAuditLog[];
        suppressionsObserved: number;
    };
    private logAdminAction;
    private validateRule;
}
