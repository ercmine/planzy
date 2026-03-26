import type { SponsoredVideoRewardPool, UserViewerRewardSummary, ViewerEngagementEvent, ViewerEngagementRiskFlag, ViewerEngagementStore, ViewerRewardAction, ViewerRewardEligibilityDecision, ViewerRewardLedgerEntry, ViewerRewardRule, WatchSession } from "./types.js";

export class MemoryViewerEngagementStore implements ViewerEngagementStore {
  private sessions = new Map<string, WatchSession>();
  private userSessions = new Map<string, string[]>();
  private eventsByUser = new Map<string, ViewerEngagementEvent[]>();
  private rules = new Map<ViewerRewardAction, ViewerRewardRule>();
  private decisionsByUser = new Map<string, ViewerRewardEligibilityDecision[]>();
  private ledger: ViewerRewardLedgerEntry[] = [];
  private ledgerById = new Map<string, ViewerRewardLedgerEntry>();
  private riskFlags: ViewerEngagementRiskFlag[] = [];
  private summaryByUser = new Map<string, UserViewerRewardSummary>();
  private poolsById = new Map<string, SponsoredVideoRewardPool>();
  private videoCampaign = new Map<string, string>();

  createWatchSession(session: WatchSession): void {
    this.sessions.set(session.id, structuredClone(session));
    this.userSessions.set(session.userId, [session.id, ...(this.userSessions.get(session.userId) ?? [])]);
  }
  updateWatchSession(session: WatchSession): void {
    this.sessions.set(session.id, structuredClone(session));
  }
  getWatchSession(sessionId: string): WatchSession | null {
    const session = this.sessions.get(sessionId);
    return session ? structuredClone(session) : null;
  }
  listUserWatchSessions(userId: string, limit = 200): WatchSession[] {
    return (this.userSessions.get(userId) ?? []).slice(0, limit).map((id) => structuredClone(this.sessions.get(id)!));
  }

  saveEvent(event: ViewerEngagementEvent): void {
    this.eventsByUser.set(event.userId, [structuredClone(event), ...(this.eventsByUser.get(event.userId) ?? [])]);
  }
  listUserEvents(userId: string, action?: ViewerRewardAction): ViewerEngagementEvent[] {
    return (this.eventsByUser.get(userId) ?? [])
      .filter((event) => !action || event.action === action)
      .map((event) => structuredClone(event));
  }

  upsertRewardRule(rule: ViewerRewardRule): void { this.rules.set(rule.action, structuredClone(rule)); }
  listRewardRules(): ViewerRewardRule[] { return [...this.rules.values()].map((rule) => structuredClone(rule)); }
  getRewardRule(action: ViewerRewardAction): ViewerRewardRule | null {
    const rule = this.rules.get(action);
    return rule ? structuredClone(rule) : null;
  }

  saveEligibilityDecision(decision: ViewerRewardEligibilityDecision): void {
    this.decisionsByUser.set(decision.userId, [structuredClone(decision), ...(this.decisionsByUser.get(decision.userId) ?? [])]);
  }
  listEligibilityDecisions(userId: string, videoId?: string): ViewerRewardEligibilityDecision[] {
    return (this.decisionsByUser.get(userId) ?? [])
      .filter((decision) => !videoId || decision.videoId === videoId)
      .map((decision) => structuredClone(decision));
  }

  saveLedgerEntry(entry: ViewerRewardLedgerEntry): void {
    this.ledgerById.set(entry.id, structuredClone(entry));
    this.ledger = [structuredClone(entry), ...this.ledger.filter((item) => item.id !== entry.id)];
  }
  listLedgerEntries(userId?: string): ViewerRewardLedgerEntry[] {
    return this.ledger.filter((entry) => !userId || entry.userId === userId).map((entry) => structuredClone(entry));
  }
  getLedgerEntry(entryId: string): ViewerRewardLedgerEntry | null {
    const entry = this.ledgerById.get(entryId);
    return entry ? structuredClone(entry) : null;
  }

  saveRiskFlag(flag: ViewerEngagementRiskFlag): void {
    this.riskFlags = [structuredClone(flag), ...this.riskFlags];
  }
  listRiskFlags(userId?: string): ViewerEngagementRiskFlag[] {
    return this.riskFlags.filter((flag) => !userId || flag.userId === userId).map((flag) => structuredClone(flag));
  }

  saveRewardSummary(summary: UserViewerRewardSummary): void {
    this.summaryByUser.set(summary.userId, structuredClone(summary));
  }
  getRewardSummary(userId: string): UserViewerRewardSummary | null {
    const summary = this.summaryByUser.get(userId);
    return summary ? structuredClone(summary) : null;
  }

  saveSponsoredPool(pool: SponsoredVideoRewardPool): void {
    this.poolsById.set(pool.id, structuredClone(pool));
  }
  getSponsoredPool(poolId: string): SponsoredVideoRewardPool | null {
    const pool = this.poolsById.get(poolId);
    return pool ? structuredClone(pool) : null;
  }
  findSponsoredPoolForVideo(videoId: string, atIso: string): SponsoredVideoRewardPool | null {
    const poolId = this.videoCampaign.get(videoId);
    if (!poolId) return null;
    const pool = this.poolsById.get(poolId);
    if (!pool) return null;
    const at = Date.parse(atIso);
    if (!pool.active || at < Date.parse(pool.startsAt) || at > Date.parse(pool.endsAt)) return null;
    return structuredClone(pool);
  }
  setVideoCampaign(videoId: string, poolId: string): void {
    this.videoCampaign.set(videoId, poolId);
  }
  listSponsoredPools(): SponsoredVideoRewardPool[] {
    return [...this.poolsById.values()].map((pool) => structuredClone(pool));
  }
}
