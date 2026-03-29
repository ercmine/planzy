import type { LeaderboardContributionEvent, LeaderboardEntityType, LeaderboardFormula, LeaderboardScoreSnapshot, LeaderboardWindow } from "./types.js";
import type { LeaderboardsStore } from "./store.js";
export declare class MemoryLeaderboardsStore implements LeaderboardsStore {
    private readonly events;
    private readonly snapshots;
    private readonly formulas;
    appendEvent(event: LeaderboardContributionEvent): void;
    hasEvent(eventId: string): boolean;
    listEvents(): LeaderboardContributionEvent[];
    saveSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey: string | undefined, rows: LeaderboardScoreSnapshot[]): void;
    getSnapshots(type: LeaderboardEntityType, window: LeaderboardWindow, scopeKey?: string): LeaderboardScoreSnapshot[];
    saveFormula(type: LeaderboardEntityType, formula: LeaderboardFormula): void;
    getFormula(type: LeaderboardEntityType): LeaderboardFormula | undefined;
}
