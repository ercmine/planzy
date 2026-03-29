import type { AdminAuditLog, GamificationEvent, RewardDecision, RuleVersion, UserGamificationState } from "./types.js";
import type { GamificationControlStore } from "./store.js";
export declare class MemoryGamificationControlStore implements GamificationControlStore {
    private readonly rules;
    private readonly processedEventIds;
    private readonly eventsByUser;
    private readonly userStates;
    private readonly decisions;
    private readonly decisionIdsByUser;
    private readonly adminLogs;
    listRuleVersions(): RuleVersion[];
    saveRuleVersion(version: RuleVersion): void;
    getRuleVersion(ruleVersionId: string): RuleVersion | undefined;
    getActiveRuleVersion(nowIso: string): RuleVersion | undefined;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
    saveEvent(event: GamificationEvent): void;
    listEventsByUser(userId: string): GamificationEvent[];
    getUserState(userId: string): UserGamificationState | undefined;
    saveUserState(state: UserGamificationState): void;
    clearUserState(userId: string): void;
    saveDecision(decision: RewardDecision): void;
    listDecisionsByUser(userId: string): RewardDecision[];
    getDecision(decisionId: string): RewardDecision | undefined;
    saveAdminAuditLog(log: AdminAuditLog): void;
    listAdminAuditLogs(): AdminAuditLog[];
}
