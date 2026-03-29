import type { AnalyticsService } from "../analytics/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { LeaderboardsStore } from "./store.js";
import type { LeaderboardAdminTuning, LeaderboardContributionEvent, LeaderboardEntityType, LeaderboardFamily, LeaderboardFormula, LeaderboardQuery, LeaderboardScoreSnapshot, LeaderboardWindow } from "./types.js";
export declare class LeaderboardsService {
    private readonly store;
    private readonly analytics?;
    private readonly notifications?;
    private readonly nowProvider;
    constructor(store: LeaderboardsStore, analytics?: AnalyticsService | undefined, notifications?: NotificationService | undefined, nowProvider?: () => Date);
    listFamilies(): LeaderboardFamily[];
    recordEvent(event: LeaderboardContributionEvent): Promise<{
        ignored: boolean;
    }>;
    rebuildSnapshots(): void;
    getLeaderboard(query: LeaderboardQuery): LeaderboardScoreSnapshot[];
    getMyRank(input: {
        type: LeaderboardEntityType;
        window: LeaderboardWindow;
        userId: string;
    }): {
        rank?: number;
        score?: number;
    };
    inspectEntity(input: {
        type: LeaderboardEntityType;
        window: LeaderboardWindow;
        entityId: string;
    }): LeaderboardScoreSnapshot | undefined;
    tuneFormula(type: LeaderboardEntityType, patch: Partial<LeaderboardFormula>): LeaderboardFormula;
    listFormulas(): LeaderboardAdminTuning;
    private rebuildTypeWindow;
    private toEntityId;
}
