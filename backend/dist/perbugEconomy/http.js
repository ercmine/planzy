import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
const requireHeader = (req, key) => {
    const value = readHeader(req, key);
    if (!value)
        throw new ValidationError([`${key} is required`]);
    return value;
};
export function createPerbugEconomyHttpHandlers(service) {
    return {
        creditUser: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { wallet: service.creditUser(String(body.userId ?? ""), Number(body.amountPerbug ?? 0), requireHeader(req, "x-admin-id")) });
        },
        createQuest: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, { quest: service.createBusinessQuest({
                    businessId: requireHeader(req, "x-business-id"),
                    createdBy: requireHeader(req, "x-user-id"),
                    placeId: String(body.placeId ?? ""),
                    title: String(body.title ?? ""),
                    actionType: String(body.actionType ?? "visit_checkin"),
                    rewardPerbug: Number(body.rewardPerbug ?? 0),
                    budgetPerbug: Number(body.budgetPerbug ?? 0),
                    dailyCap: Number(body.dailyCap ?? 100),
                    totalCap: Number(body.totalCap ?? 1000),
                    startsAt: String(body.startsAt ?? new Date().toISOString()),
                    endsAt: String(body.endsAt ?? new Date(Date.now() + 7 * 86400000).toISOString())
                }) });
        },
        completeQuest: async (req, res, questId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { completion: service.completeQuest({ questId, userId: requireHeader(req, "x-user-id"), deviceTrustScore: Number(body.deviceTrustScore ?? 0.8) }) });
        },
        checkIn: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, service.recordExplorationCheckIn({
                userId: requireHeader(req, "x-user-id"),
                placeId: String(body.placeId ?? ""),
                neighborhoodId: String(body.neighborhoodId ?? ""),
                verified: Boolean(body.verified ?? true),
                dwellSeconds: Number(body.dwellSeconds ?? 0),
                fromGuideId: body.fromGuideId ? String(body.fromGuideId) : undefined
            }));
        },
        upsertCollection: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { collection: service.upsertCollection({
                    id: String(body.id ?? ""),
                    title: String(body.title ?? ""),
                    placeIds: Array.isArray(body.placeIds) ? body.placeIds.map(String) : [],
                    milestoneRewardsAtomic: Array.isArray(body.milestoneRewardsPerbug) ? body.milestoneRewardsPerbug.map((value) => BigInt(Math.round(Number(value) * 1_000_000))) : [],
                    completionRewardAtomic: BigInt(Math.round(Number(body.completionRewardPerbug ?? 0) * 1_000_000)),
                    sponsoredByBusinessId: typeof body.sponsoredByBusinessId === "string" ? body.sponsoredByBusinessId : undefined,
                    startsAt: typeof body.startsAt === "string" ? body.startsAt : undefined,
                    endsAt: typeof body.endsAt === "string" ? body.endsAt : undefined,
                    active: Boolean(body.active ?? true)
                }, requireHeader(req, "x-admin-id")) });
        },
        progressCollection: async (req, res, collectionId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, service.progressCollection({ userId: requireHeader(req, "x-user-id"), collectionId, placeId: String(body.placeId ?? "") }));
        },
        recordCreatorReward: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, { reward: service.recordCreatorEngagement({
                    userId: requireHeader(req, "x-user-id"),
                    contentId: String(body.contentId ?? ""),
                    contentType: String(body.contentType ?? "text_review"),
                    qualitySignals: {
                        saves: Number(body.saves ?? 0),
                        shares: Number(body.shares ?? 0),
                        completionRate: Number(body.completionRate ?? 0),
                        helpfulVotes: Number(body.helpfulVotes ?? 0),
                        visitsDriven: Number(body.visitsDriven ?? 0),
                        redemptionsDriven: Number(body.redemptionsDriven ?? 0)
                    },
                    trustTier: String(body.trustTier ?? "bronze"),
                    moderationState: String(body.moderationState ?? "pending"),
                    selfDealDetected: Boolean(body.selfDealDetected ?? false)
                }) });
        },
        claimCreatorReward: async (req, res, rewardId) => {
            sendJson(res, 200, { reward: service.claimCreatorReward({ rewardId, userId: requireHeader(req, "x-user-id") }) });
        },
        createGuide: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, { guide: service.createGuide({
                    curatorUserId: requireHeader(req, "x-user-id"),
                    title: String(body.title ?? ""),
                    placeIds: Array.isArray(body.placeIds) ? body.placeIds.map(String) : [],
                    cityId: String(body.cityId ?? ""),
                    sponsoredByBusinessId: typeof body.sponsoredByBusinessId === "string" ? body.sponsoredByBusinessId : undefined,
                    status: String(body.status ?? "draft")
                }) });
        },
        guideAnalytics: async (req, res, guideId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { analytics: service.recordGuidePerformance({ guideId, saves: Number(body.saves ?? 0), follows: Number(body.follows ?? 0), drivenVisits: Number(body.drivenVisits ?? 0), completedRoutes: Number(body.completedRoutes ?? 0), downstreamReviews: Number(body.downstreamReviews ?? 0) }) });
        },
        purchaseMembership: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { membership: service.purchaseMembership({ userId: requireHeader(req, "x-user-id"), tier: body.tier ?? "pro", months: Number(body.months ?? 1), autoRenew: Boolean(body.autoRenew ?? true), actor: requireHeader(req, "x-user-id") }) });
        },
        createOffer: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 201, { offer: service.createOffer({
                    businessId: requireHeader(req, "x-business-id"),
                    placeId: String(body.placeId ?? ""),
                    title: String(body.title ?? ""),
                    costPerbug: Number(body.costPerbug ?? 0),
                    inventory: Number(body.inventory ?? 0),
                    startsAt: String(body.startsAt ?? new Date().toISOString()),
                    endsAt: String(body.endsAt ?? new Date(Date.now() + 30 * 86400000).toISOString()),
                    createdBy: requireHeader(req, "x-user-id")
                }) });
        },
        redeemOffer: async (req, res, offerId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { redemption: service.redeemOffer({ offerId, userId: requireHeader(req, "x-user-id"), deviceTrustScore: Number(body.deviceTrustScore ?? 0.9) }) });
        },
        updateSplit: async (req, res) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { split: service.updateTokenSplitConfig({
                    feature: String(body.feature ?? "business_quest"),
                    rewardPoolBps: Number(body.rewardPoolBps ?? 0),
                    creatorPoolBps: Number(body.creatorPoolBps ?? 0),
                    treasuryBps: Number(body.treasuryBps ?? 0),
                    burnBps: Number(body.burnBps ?? 0),
                    partnerBps: Number(body.partnerBps ?? 0),
                    actor: requireHeader(req, "x-admin-id"),
                    updatedBy: requireHeader(req, "x-admin-id")
                }) });
        },
        adminDashboard: async (_req, res) => sendJson(res, 200, service.adminDashboard()),
        consumerDashboard: async (req, res) => sendJson(res, 200, service.consumerDashboard(requireHeader(req, "x-user-id"))),
        creatorDashboard: async (req, res) => sendJson(res, 200, service.creatorDashboard(requireHeader(req, "x-user-id"))),
        businessDashboard: async (req, res) => sendJson(res, 200, service.businessDashboard(requireHeader(req, "x-business-id")))
    };
}
