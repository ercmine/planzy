import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { CompetitionService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export function createCompetitionHttpHandlers(service: CompetitionService) {
  return {
    home: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, service.getHome(requireUserId(req))),
    missions: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { missions: service.listMissions() }),
    missionProgress: async (req: IncomingMessage, res: ServerResponse, missionId: string) => sendJson(res, 200, { progress: service.getMissionProgress(missionId, requireUserId(req)) }),
    claimMission: async (req: IncomingMessage, res: ServerResponse, missionId: string) => sendJson(res, 200, { reward: service.claimMission(missionId, requireUserId(req)) }),
    leaderboards: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { leaderboards: service.listLeaderboards().map((board) => service.getLeaderboard(board.id)) }),
    leaderboard: async (_req: IncomingMessage, res: ServerResponse, leaderboardId: string) => sendJson(res, 200, service.getLeaderboard(leaderboardId)),
    myRewards: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { rewards: service.listRewards(requireUserId(req)) }),
    claimReward: async (req: IncomingMessage, res: ServerResponse, rewardId: string) => sendJson(res, 200, { reward: service.claimReward(rewardId, requireUserId(req)) }),
    videoQuality: async (_req: IncomingMessage, res: ServerResponse, videoId: string) => sendJson(res, 200, { quality: service.getVideoQuality(videoId) }),
    season: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { season: service.getCurrentSeason() }),
    adminCreateMission: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 201, { mission: service.createMission({
        id: String(body.id ?? `mission_${Date.now()}`),
        type: String(body.type ?? "approved_reviews_in_period") as never,
        title: String(body.title ?? "Competition mission"),
        description: String(body.description ?? ""),
        rewardAtomic: BigInt(String(body.rewardAtomic ?? "0")),
        startsAt: String(body.startsAt ?? new Date().toISOString()),
        endsAt: String(body.endsAt ?? new Date().toISOString()),
        repeatMode: String(body.repeatMode ?? "weekly") as never,
        goalType: String(body.goalType ?? "approved_reviews") as never,
        goalValue: Number(body.goalValue ?? 1),
        category: body.category == null ? undefined : String(body.category),
        city: body.city == null ? undefined : String(body.city),
        active: body.active !== false
      }, readHeader(req, "x-admin-id") ?? "admin") });
    },
    adminCreateLeaderboard: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 201, { leaderboard: service.createLeaderboard({
        id: String(body.id ?? `leaderboard_${Date.now()}`),
        type: String(body.type ?? "weekly_global") as never,
        name: String(body.name ?? "Competition leaderboard"),
        scopeType: String(body.scopeType ?? "global") as never,
        scopeValue: body.scopeValue == null ? undefined : String(body.scopeValue),
        startsAt: String(body.startsAt ?? new Date().toISOString()),
        endsAt: String(body.endsAt ?? new Date().toISOString()),
        rewardPoolAtomic: BigInt(String(body.rewardPoolAtomic ?? "0")),
        scoringRuleVersion: String(body.scoringRuleVersion ?? "v1"),
        active: body.active !== false
      }, readHeader(req, "x-admin-id") ?? "admin") });
    },
    adminBlockReward: async (req: IncomingMessage, res: ServerResponse, rewardId: string) => sendJson(res, 200, { reward: service.blockReward(rewardId, readHeader(req, "x-admin-id") ?? "admin") }),
    adminRecomputeQuality: async (req: IncomingMessage, res: ServerResponse, videoId: string) => sendJson(res, 200, { quality: service.recomputeVideoQuality(videoId, readHeader(req, "x-admin-id") ?? "admin") }),
    adminAudit: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { logs: service.listAuditLogs() })
  };
}
