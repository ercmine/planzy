import type { IncomingMessage, ServerResponse } from "node:http";
import type { CompetitionService } from "./service.js";
export declare function createCompetitionHttpHandlers(service: CompetitionService): {
    home: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    missions: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    missionProgress: (req: IncomingMessage, res: ServerResponse, missionId: string) => Promise<void>;
    claimMission: (req: IncomingMessage, res: ServerResponse, missionId: string) => Promise<void>;
    leaderboards: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    leaderboard: (_req: IncomingMessage, res: ServerResponse, leaderboardId: string) => Promise<void>;
    myRewards: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    claimReward: (req: IncomingMessage, res: ServerResponse, rewardId: string) => Promise<void>;
    videoQuality: (_req: IncomingMessage, res: ServerResponse, videoId: string) => Promise<void>;
    season: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminCreateMission: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminCreateLeaderboard: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
    adminBlockReward: (req: IncomingMessage, res: ServerResponse, rewardId: string) => Promise<void>;
    adminRecomputeQuality: (req: IncomingMessage, res: ServerResponse, videoId: string) => Promise<void>;
    adminAudit: (_req: IncomingMessage, res: ServerResponse) => Promise<void>;
};
