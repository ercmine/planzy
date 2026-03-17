import type { AdminAuditLog, GamificationEvent, RewardDecision, RuleVersion, UserGamificationState } from "./types.js";
import type { GamificationControlStore } from "./store.js";

export class MemoryGamificationControlStore implements GamificationControlStore {
  private readonly rules = new Map<string, RuleVersion>();
  private readonly processedEventIds = new Set<string>();
  private readonly eventsByUser = new Map<string, GamificationEvent[]>();
  private readonly userStates = new Map<string, UserGamificationState>();
  private readonly decisions = new Map<string, RewardDecision>();
  private readonly decisionIdsByUser = new Map<string, string[]>();
  private readonly adminLogs: AdminAuditLog[] = [];

  listRuleVersions(): RuleVersion[] {
    return [...this.rules.values()].sort((a, b) => b.version - a.version);
  }

  saveRuleVersion(version: RuleVersion): void {
    this.rules.set(version.id, version);
  }

  getRuleVersion(ruleVersionId: string): RuleVersion | undefined {
    return this.rules.get(ruleVersionId);
  }

  getActiveRuleVersion(nowIso: string): RuleVersion | undefined {
    return this.listRuleVersions().find((rule) =>
      rule.lifecycle === "active" && (!rule.effectiveFrom || rule.effectiveFrom <= nowIso));
  }

  hasProcessedEvent(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  markProcessedEvent(eventId: string): void {
    this.processedEventIds.add(eventId);
  }

  saveEvent(event: GamificationEvent): void {
    const current = this.eventsByUser.get(event.userId) ?? [];
    current.push(event);
    this.eventsByUser.set(event.userId, current);
  }

  listEventsByUser(userId: string): GamificationEvent[] {
    return [...(this.eventsByUser.get(userId) ?? [])].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  }

  getUserState(userId: string): UserGamificationState | undefined {
    return this.userStates.get(userId);
  }

  saveUserState(state: UserGamificationState): void {
    this.userStates.set(state.userId, state);
  }

  clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  saveDecision(decision: RewardDecision): void {
    this.decisions.set(decision.decisionId, decision);
    const ids = this.decisionIdsByUser.get(decision.userId) ?? [];
    ids.push(decision.decisionId);
    this.decisionIdsByUser.set(decision.userId, ids);
  }

  listDecisionsByUser(userId: string): RewardDecision[] {
    return (this.decisionIdsByUser.get(userId) ?? []).map((id) => this.decisions.get(id)).filter(Boolean) as RewardDecision[];
  }

  getDecision(decisionId: string): RewardDecision | undefined {
    return this.decisions.get(decisionId);
  }

  saveAdminAuditLog(log: AdminAuditLog): void {
    this.adminLogs.push(log);
  }

  listAdminAuditLogs(): AdminAuditLog[] {
    return [...this.adminLogs];
  }
}
