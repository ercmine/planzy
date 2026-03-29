import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createDryadRewardsHttpHandlers(service) {
    return {
        preview: async (_req, res, placeId) => sendJson(res, 200, service.getRewardPreview(placeId)),
        createWalletNonce: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.publicKey)
                throw new ValidationError(["publicKey required"]);
            sendJson(res, 200, service.createWalletNonce(body.publicKey));
        },
        verifyWalletLogin: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.publicKey || !body.signature)
                throw new ValidationError(["publicKey and signature required"]);
            sendJson(res, 200, service.verifyWalletLogin({ publicKey: body.publicKey, signature: body.signature, userId: body.userId ?? readHeader(req, "x-user-id") }));
        },
        listWallets: async (req, res) => sendJson(res, 200, { wallets: service.listWallets(requireUserId(req)) }),
        setPrimaryWallet: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.publicKey)
                throw new ValidationError(["publicKey required"]);
            sendJson(res, 200, { wallet: service.setPrimaryWallet(requireUserId(req), body.publicKey) });
        },
        dashboard: async (req, res) => sendJson(res, 200, service.getDashboard(requireUserId(req))),
        submitReview: async (req, res) => {
            const body = await parseJsonBody(req);
            if (!body.placeId || !body.videoUrl || !body.contentHash)
                throw new ValidationError(["placeId, videoUrl, contentHash required"]);
            sendJson(res, 201, { review: service.submitReview({ userId: requireUserId(req), placeId: body.placeId, videoUrl: body.videoUrl, contentHash: body.contentHash, qualityRating: body.qualityRating, videoId: body.videoId, creatorProfileId: body.creatorProfileId, reviewId: body.reviewId }) });
        },
        approveReview: async (req, res, reviewId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { review: service.approveReview({ reviewId, actorUserId: requireUserId(req), qualityRating: body.qualityRating, adminDistinctRewardSlotEnabled: body.adminDistinctRewardSlotEnabled }) });
        },
        rejectReview: async (req, res, reviewId) => {
            const body = await parseJsonBody(req);
            sendJson(res, 200, { review: service.rejectReview({ reviewId, actorUserId: requireUserId(req), reason: body.reason ?? "rejected" }) });
        },
        claim: async (req, res, rewardId) => {
            const body = await parseJsonBody(req);
            if (!body.walletPublicKey)
                throw new ValidationError(["walletPublicKey required"]);
            sendJson(res, 200, await service.claimReward({ userId: requireUserId(req), reviewId: rewardId, walletPublicKey: body.walletPublicKey, idempotencyKey: body.idempotencyKey }));
        },
        auditLogs: async (_req, res) => sendJson(res, 200, { logs: service.listAuditLogs() }),
        rewardTiers: async (_req, res) => sendJson(res, 200, { rewardTiers: service.listRewardTiers() })
    };
}
