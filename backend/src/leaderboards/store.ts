import type { LeaderboardContributionEvent, LeaderboardEntityType, LeaderboardFormula, LeaderboardScoreSnapshot, LeaderboardWindow } from "./types.js";

export interface LeaderboardsStore {
  appendEvent(event: LeaderboardContributionEvent): void;
  hasEvent(eventId: string): boolean;
  listEvents(): LeaderboardContributionEvent[];
  saveSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey: string | undefined, rows: LeaderboardScoreSnapshot[]): void;
  getSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey?: string): LeaderboardScoreSnapshot[];
  saveFormula(type: LeaderboardEntityType, formula: LeaderboardFormula): void;
  getFormula(type: LeaderboardEntityType): LeaderboardFormula | undefined;
}
