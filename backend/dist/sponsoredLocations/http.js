import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUser(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id is required"]);
    return userId;
}
function requireBusiness(req) {
    const businessId = readHeader(req, "x-business-id");
    if (!businessId)
        throw new ValidationError(["x-business-id is required"]);
    return businessId;
}
function requireAdmin(req) {
    const adminId = readHeader(req, "x-admin-id");
    if (!adminId)
        throw new ValidationError(["x-admin-id is required"]);
    return adminId;
}
export function createSponsoredLocationsHttpHandlers(service) {
    return {
        requestPlaceAccess: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.placeId)
                throw new ValidationError(["placeId required"]);
            sendJson(res, 201, { access: service.requestPlaceAccess({ placeId: body.placeId, businessId: requireBusiness(req), userId: requireUser(req), role: body.role }) });
        },
        approvePlaceAccess: async (req, res, accessId) => {
            sendJson(res, 200, { access: service.approvePlaceAccess({ accessId, adminUserId: requireAdmin(req) }) });
        },
        createCampaign: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, service.createCampaign({
                businessId: requireBusiness(req),
                createdBy: requireUser(req),
                placeId: String(body.placeId ?? ""),
                title: String(body.title ?? ""),
                callToAction: typeof body.callToAction === "string" ? body.callToAction : undefined,
                categoryTags: Array.isArray(body.categoryTags) ? body.categoryTags.map(String) : [],
                placements: Array.isArray(body.placements) ? body.placements : ["map"],
                targetRadiusMeters: Number(body.targetRadiusMeters ?? 250),
                startsAt: String(body.startsAt),
                endsAt: String(body.endsAt),
                dailyBudgetPerbug: Number(body.dailyBudgetPerbug ?? 0),
                totalBudgetPerbug: Number(body.totalBudgetPerbug ?? 0),
                rewardRule: {
                    type: body.rewardRule && typeof body.rewardRule === "object" ? String(body.rewardRule.type ?? "fixed_per_visit") : "fixed_per_visit",
                    payoutPerVisitPerbug: Number((body.rewardRule?.payoutPerVisitPerbug) ?? 0),
                    decayBps: Number((body.rewardRule?.decayBps) ?? 0),
                    firstXDaily: Number((body.rewardRule?.firstXDaily) ?? 0),
                    splitWindowDays: Number((body.rewardRule?.splitWindowDays) ?? 0),
                    cooldownHours: Number((body.rewardRule?.cooldownHours) ?? 24),
                    dwellSeconds: Number((body.rewardRule?.dwellSeconds) ?? 180),
                    oneRewardPerDay: Boolean((body.rewardRule?.oneRewardPerDay) ?? true),
                    requiredActions: Array.isArray((body.rewardRule?.requiredActions)) ? body.rewardRule.requiredActions : ["check_in", "dwell"]
                }
            }));
        },
        fundCampaign: async (req, res, campaignId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { budget: service.fundCampaign({ campaignId, businessId: requireBusiness(req), amountPerbug: Number(body.amountPerbug ?? 0) }) });
        },
        listBusinessCampaigns: async (req, res) => sendJson(res, 200, { campaigns: service.listBusinessCampaigns(requireBusiness(req)) }),
        placements: async (_req, res, url) => {
            const lat = Number(url.searchParams.get("lat") ?? "0");
            const lng = Number(url.searchParams.get("lng") ?? "0");
            const surface = String(url.searchParams.get("surface") ?? "map");
            sendJson(res, 200, { placements: service.getSponsoredPlacements({ lat, lng, surface }) });
        },
        startVisit: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.campaignId)
                throw new ValidationError(["campaignId required"]);
            sendJson(res, 201, { visit: service.startVisitSession({ userId: requireUser(req), campaignId: body.campaignId, lat: Number(body.lat ?? 0), lng: Number(body.lng ?? 0) }) });
        },
        heartbeatVisit: async (req, res, visitSessionId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { visit: service.heartbeatVisit({ visitSessionId, lat: Number(body.lat ?? 0), lng: Number(body.lng ?? 0), elapsedSeconds: Number(body.elapsedSeconds ?? 0) }) });
        },
        verifyVisit: async (req, res, visitSessionId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { decision: service.verifyVisit({ visitSessionId, actions: (body.actions ?? []), deviceId: body.deviceId, ipHash: body.ipHash }) });
        },
        claimReward: async (req, res, visitSessionId) => sendJson(res, 200, { claim: await service.claimReward({ visitSessionId, userId: requireUser(req) }) }),
        userRewards: async (req, res) => sendJson(res, 200, { claims: service.listUserRewardHistory(requireUser(req)) }),
        pauseCampaign: async (req, res, campaignId) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "paused" }) }),
        resumeCampaign: async (req, res, campaignId) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "active" }) }),
        endCampaign: async (req, res, campaignId) => sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, businessId: requireBusiness(req), status: "ended" }) }),
        adminFraudFlags: async (_req, res) => sendJson(res, 200, { flags: service.listFraudFlags() }),
        adminReviewClaim: async (req, res, claimId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { claim: service.adminModerateClaim({ claimId, action: body.action ?? "reject", reason: body.reason, adminUserId: requireAdmin(req) }) });
        },
        adminRefundCampaign: async (req, res, campaignId) => sendJson(res, 200, service.issueRefund({ campaignId, adminUserId: requireAdmin(req) })),
        adminSetCampaignStatus: async (req, res, campaignId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { campaign: service.setCampaignStatus({ campaignId, status: body.status ?? "paused", adminOverride: true }) });
        },
        campaignLedger: async (_req, res, campaignId) => sendJson(res, 200, { ledger: service.listCampaignLedger(campaignId) })
    };
}
