import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { SponsoredLocationsService } from "./service.js";

function requireUser(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id is required"]);
  return userId;
}

function requireBusiness(req: IncomingMessage): string {
  const businessId = readHeader(req, "x-business-id");
  if (!businessId) throw new ValidationError(["x-business-id is required"]);
  return businessId;
}

function requireAdmin(req: IncomingMessage): string {
  const adminId = readHeader(req, "x-admin-id");
  if (!adminId) throw new ValidationError(["x-admin-id is required"]);
  return adminId;
}

export function createSponsoredLocationsHttpHandlers(service: SponsoredLocationsService) {
  return {
    requestPlaceAccess: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { placeId?: string; role?: "owner" | "manager" };
      if (!body.placeId) throw new ValidationError(["placeId required"]);
      sendJson(res, 201, { access: service.requestPlaceAccess({ placeId: body.placeId, businessId: requireBusiness(req), userId: requireUser(req), role: body.role }) });
    },
    approvePlaceAccess: async (req: IncomingMessage, res: ServerResponse, accessId: string) => {
      sendJson(res, 200, { access: service.approvePlaceAccess({ accessId, adminUserId: requireAdmin(req) }) });
    },
    createCampaign: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 201, service.createCampaign({
        businessId: requireBusiness(req),
        createdBy: requireUser(req),
        placeId: String(body.placeId ?? ""),
        title: String(body.title ?? ""),
        callToAction: typeof body.callToAction === "string" ? body.callToAction : undefined,
        categoryTags: Array.isArray(body.categoryTags) ? body.categoryTags.map(String) : [],
        placements: Array.isArray(body.placements) ? body.placements as never : ["map"],
        targetRadiusMeters: Number(body.targetRadiusMeters ?? 250),
        startsAt: String(body.startsAt),
        endsAt: String(body.endsAt),
        dailyBudgetPerbug: Number(body.dailyBudgetPerbug ?? 0),
        totalBudgetPerbug: Number(body.totalBudgetPerbug ?? 0),
        rewardRule: {
          type: body.rewardRule && typeof body.rewardRule === "object" ? String((body.rewardRule as Record<string, unknown>).type ?? "fixed_per_visit") as never : "fixed_per_visit",
          payoutPerVisitPerbug: Number(((body.rewardRule as Record<string, unknown> | undefined)?.payoutPerVisitPerbug) ?? 0),
          decayBps: Number(((body.rewardRule as Record<string, unknown> | undefined)?.decayBps) ?? 0),
          firstXDaily: Number(((body.rewardRule as Record<string, unknown> | undefined)?.firstXDaily) ?? 0),
          splitWindowDays: Number(((body.rewardRule as Record<string, unknown> | undefined)?.splitWindowDays) ?? 0),
          cooldownHours: Number(((body.rewardRule as Record<string, unknown> | undefined)?.cooldownHours) ?? 24),
          dwellSeconds: Number(((body.rewardRule as Record<string, unknown> | undefined)?.dwellSeconds) ?? 180),
          oneRewardPerDay: Boolean(((body.rewardRule as Record<string, unknown> | undefined)?.oneRewardPerDay) ?? true),
          requiredActions: Array.isArray(((body.rewardRule as Record<string, unknown> | undefined)?.requiredActions)) ? ((body.rewardRule as Record<string, unknown>).requiredActions as string[]) as never : ["check_in", "dwell"]
        }
      }));
    },
    fundCampaign: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => {
      const body = await parseJsonBody(req) as { amountPerbug?: number };
      sendJson(res, 200, { budget: service.fundCampaign({ campaignId, businessId: requireBusiness(req), amountPerbug: Number(body.amountPerbug ?? 0) }) });
    },
    listBusinessCampaigns: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { campaigns: service.listBusinessCampaigns(requireBusiness(req)) }),
    placements: async (_req: IncomingMessage, res: ServerResponse, url: URL) => {
      const lat = Number(url.searchParams.get("lat") ?? "0");
      const lng = Number(url.searchParams.get("lng") ?? "0");
      const surface = String(url.searchParams.get("surface") ?? "map") as never;
      sendJson(res, 200, { placements: service.getSponsoredPlacements({ lat, lng, surface }) });
    },
    startVisit: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { campaignId?: string; lat?: number; lng?: number };
      if (!body.campaignId) throw new ValidationError(["campaignId required"]);
      sendJson(res, 201, { visit: service.startVisitSession({ userId: requireUser(req), campaignId: body.campaignId, lat: Number(body.lat ?? 0), lng: Number(body.lng ?? 0) }) });
    },
    heartbeatVisit: async (req: IncomingMessage, res: ServerResponse, visitSessionId: string) => {
      const body = await parseJsonBody(req) as { lat?: number; lng?: number; elapsedSeconds?: number };
      sendJson(res, 200, { visit: service.heartbeatVisit({ visitSessionId, lat: Number(body.lat ?? 0), lng: Number(body.lng ?? 0), elapsedSeconds: Number(body.elapsedSeconds ?? 0) }) });
    },
    verifyVisit: async (req: IncomingMessage, res: ServerResponse, visitSessionId: string) => {
      const body = await parseJsonBody(req) as { actions?: string[]; deviceId?: string; ipHash?: string };
      sendJson(res, 200, { decision: service.verifyVisit({ visitSessionId, actions: (body.actions ?? []) as never, deviceId: body.deviceId, ipHash: body.ipHash }) });
    },
    claimReward: async (req: IncomingMessage, res: ServerResponse, visitSessionId: string) => sendJson(res, 200, { claim: await service.claimReward({ visitSessionId, userId: requireUser(req) }) }),
    userRewards: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { claims: service.listUserRewardHistory(requireUser(req)) }),
    pauseCampaign: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "paused" }) }),
    resumeCampaign: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "active" }) }),
    endCampaign: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "ended" }) }),
    adminFraudFlags: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { flags: service.listFraudFlags() }),
    adminReviewClaim: async (req: IncomingMessage, res: ServerResponse, claimId: string) => {
      const body = await parseJsonBody(req) as { action?: "approve" | "reject"; reason?: string };
      sendJson(res, 200, { claim: service.adminModerateClaim({ claimId, action: body.action ?? "reject", reason: body.reason, adminUserId: requireAdmin(req) }) });
    },
    adminRefundCampaign: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => sendJson(res, 200, service.issueRefund({ campaignId, adminUserId: requireAdmin(req) })),
    adminSetCampaignStatus: async (req: IncomingMessage, res: ServerResponse, campaignId: string) => {
      const body = await parseJsonBody(req) as { status?: "active" | "paused" | "ended" | "exhausted" | "rejected" };
      sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, status: body.status ?? "paused", adminOverride: true }) });
    },
    campaignLedger: async (_req: IncomingMessage, res: ServerResponse, campaignId: string) => sendJson(res, 200, { ledger: service.listCampaignLedger(campaignId) })
  };
}
