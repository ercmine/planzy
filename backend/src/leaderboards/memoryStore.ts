import type { LeaderboardContributionEvent, LeaderboardEntityType, LeaderboardFormula, LeaderboardScoreSnapshot, LeaderboardWindow } from "./types.js";
import type { LeaderboardsStore } from "./store.js";

function key(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey?: string): string {
  return `${type}:${window}:${scopeKey ?? "global"}`;
}

export class MemoryLeaderboardsStore implements LeaderboardsStore {
  private readonly events = new Map<string, LeaderboardContributionEvent>();
  private readonly snapshots = new Map<string, LeaderboardScoreSnapshot[]>();
  private readonly formulas = new Map<LeaderboardEntityType, LeaderboardFormula>();

  appendEvent(event: LeaderboardContributionEvent): void {
    this.events.set(event.eventId, event);
  }
  hasEvent(eventId: string): boolean {
    return this.events.has(eventId);
  }
  listEvents(): LeaderboardContributionEvent[] {
    return [...this.events.values()];
  }
  saveSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey: string | undefined, rows: LeaderboardScoreSnapshot[]): void {
    this.snapshots.set(key(type, window, scopeKey), rows);
  }
  getSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey?: string): LeaderboardScoreSnapshot[] {
    return this.snapshots.get(key(type, window, scopeKey)) ?? [];
  }
  saveFormula(type: LeaderboardEntityType, formula: LeaderboardFormula): void {
    this.formulas.set(type, formula);
  }
  getFormula(type: LeaderboardEntityType): LeaderboardFormula | undefined {
    return this.formulas.get(type);
  }
}
