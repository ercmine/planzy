import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { ViewerEngagementRewardsService } from "./service.js";
import type { ViewerRewardAction, ViewerRewardRule } from "./types.js";

function requireUserId(req: IncomingMessage): string {
  const userId = String(readHeader(req, "x-user-id") ?? "").trim();
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export interface ViewerEngagementRewardHttpHandlers {
  startSession(req: IncomingMessage, res: ServerResponse): Promise<void>;
  heartbeat(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
  pauseSession(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
  completeSession(req: IncomingMessage, res: ServerResponse, sessionId: string): Promise<void>;
  submitRating(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  submitComment(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  submitEngagement(req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  getEligibility(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
  listRewards(req: IncomingMessage, res: ServerResponse): Promise<void>;
  rewardSummary(req: IncomingMessage, res: ServerResponse): Promise<void>;
  campaignMetadata(_req: IncomingMessage, res: ServerResponse, videoId: string): Promise<void>;
  createSponsoredPool(req: IncomingMessage, res: ServerResponse): Promise<void>;
  mapVideoCampaign(req: IncomingMessage, res: ServerResponse): Promise<void>;
  listRiskFlags(req: IncomingMessage, res: ServerResponse, query: URLSearchParams): Promise<void>;
  updateRule(req: IncomingMessage, res: ServerResponse): Promise<void>;
  reverseReward(req: IncomingMessage, res: ServerResponse, ledgerEntryId: string): Promise<void>;
}

export function createViewerEngagementRewardsHttpHandlers(service: ViewerEngagementRewardsService): ViewerEngagementRewardHttpHandlers {
  return {
    async startSession(req, res) {
      const body = await parseJsonBody(req) as { videoId?: string; durationMs?: number; deviceId?: string; ipHash?: string };
      if (!body.videoId || typeof body.durationMs !== "number") throw new ValidationError(["videoId and durationMs are required"]);
      sendJson(res, 201, { session: service.startWatchSession({ userId: requireUserId(req), ...body as { videoId: string; durationMs: number; deviceId?: string; ipHash?: string } }) });
    },
    async heartbeat(req, res, sessionId) {
      const body = await parseJsonBody(req) as { watchMs?: number; progressMs?: number; foreground?: boolean };
      if (typeof body.watchMs !== "number" || typeof body.progressMs !== "number" || typeof body.foreground !== "boolean") {
        throw new ValidationError(["watchMs, progressMs, foreground are required"]);
      }
      sendJson(res, 200, service.heartbeat({ userId: requireUserId(req), sessionId, watchMs: body.watchMs, progressMs: body.progressMs, foreground: body.foreground }));
    },
    async pauseSession(req, res, sessionId) {
      sendJson(res, 200, { session: service.pauseSession({ userId: requireUserId(req), sessionId }) });
    },
    async completeSession(req, res, sessionId) {
      sendJson(res, 200, { session: service.completeWatchSession({ userId: requireUserId(req), sessionId }) });
    },
    async submitRating(req, res, videoId) {
      const body = await parseJsonBody(req) as { rating?: number };
      if (typeof body.rating !== "number") throw new ValidationError(["rating is required"]);
      sendJson(res, 200, service.submitRating({ userId: requireUserId(req), videoId, rating: body.rating }));
    },
    async submitComment(req, res, videoId) {
      const body = await parseJsonBody(req) as { text?: string; parentCommentId?: string; moderated?: boolean; deleted?: boolean };
      if (!body.text) throw new ValidationError(["text is required"]);
      sendJson(res, 200, service.submitComment({ userId: requireUserId(req), videoId, text: body.text, parentCommentId: body.parentCommentId, moderated: body.moderated, deleted: body.deleted }));
    },
    async submitEngagement(req, res, videoId) {
      const body = await parseJsonBody(req) as { action?: ViewerRewardAction; metadata?: Record<string, unknown> };
      if (!body.action || !["save", "share", "place_click", "follow_creator", "playlist_chain"].includes(body.action)) {
        throw new ValidationError(["action must be one of save/share/place_click/follow_creator/playlist_chain"]);
      }
      sendJson(res, 200, service.submitEngagement({ userId: requireUserId(req), videoId, action: body.action as "save" | "share" | "place_click" | "follow_creator" | "playlist_chain", metadata: body.metadata }));
    },
    async getEligibility(req, res, query) {
      const videoId = String(query.get("videoId") ?? "").trim();
      const action = String(query.get("action") ?? "").trim() as ViewerRewardAction;
      if (!videoId || !action) throw new ValidationError(["videoId and action are required"]);
      sendJson(res, 200, { decision: service.getEligibility({ userId: requireUserId(req), videoId, action }) });
    },
    async listRewards(req, res) {
      sendJson(res, 200, { rewards: service.listViewerRewards(requireUserId(req)) });
    },
    async rewardSummary(req, res) {
      sendJson(res, 200, { summary: service.getViewerSummary(requireUserId(req)) });
    },
    async campaignMetadata(_req, res, videoId) {
      sendJson(res, 200, { campaign: service.getCampaignMetadata(videoId) });
    },
    async createSponsoredPool(req, res) {
      const body = await parseJsonBody(req) as {
        campaignId?: string;
        sponsorBusinessId?: string;
        fundedAtomic?: string;
        startsAt?: string;
        endsAt?: string;
        active?: boolean;
        eligibleActions?: ViewerRewardAction[];
        perUserDailyCapAtomic?: string;
      };
      if (!body.campaignId || !body.sponsorBusinessId || !body.fundedAtomic || !body.startsAt || !body.endsAt || !Array.isArray(body.eligibleActions) || !body.perUserDailyCapAtomic) {
        throw new ValidationError(["campaignId, sponsorBusinessId, fundedAtomic, startsAt, endsAt, eligibleActions, perUserDailyCapAtomic are required"]);
      }
      sendJson(res, 201, {
        pool: service.createSponsoredPool({
          campaignId: body.campaignId,
          sponsorBusinessId: body.sponsorBusinessId,
          fundedAtomic: BigInt(body.fundedAtomic),
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          active: body.active ?? true,
          eligibleActions: body.eligibleActions,
          perUserDailyCapAtomic: BigInt(body.perUserDailyCapAtomic)
        })
      });
    },
    async mapVideoCampaign(req, res) {
      const body = await parseJsonBody(req) as { videoId?: string; poolId?: string };
      if (!body.videoId || !body.poolId) throw new ValidationError(["videoId and poolId are required"]);
      sendJson(res, 200, service.mapVideoToCampaign({ videoId: body.videoId, poolId: body.poolId }));
    },
    async listRiskFlags(_req, res, query) {
      sendJson(res, 200, { flags: service.listRiskFlags(String(query.get("userId") ?? "").trim() || undefined) });
    },
    async updateRule(req, res) {
      const body = await parseJsonBody(req) as ViewerRewardRule;
      sendJson(res, 200, { rule: service.updateRule({ ...body, baseRewardAtomic: BigInt(String(body.baseRewardAtomic)) }) });
    },
    async reverseReward(req, res, ledgerEntryId) {
      const body = await parseJsonBody(req) as { reason?: string };
      sendJson(res, 200, { entry: service.reverseReward({ ledgerEntryId, actor: requireUserId(req), reason: body.reason ?? "admin_manual_reversal" }) });
    }
  };
}
