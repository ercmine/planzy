import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { PerbugRewardsService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export function createPerbugRewardsHttpHandlers(service: PerbugRewardsService) {
  return {
    preview: async (_req: IncomingMessage, res: ServerResponse, placeId: string) => sendJson(res, 200, service.getRewardPreview(placeId)),
    createWalletNonce: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { publicKey?: string };
      if (!body.publicKey) throw new ValidationError(["publicKey required"]);
      sendJson(res, 200, service.createWalletNonce(body.publicKey));
    },
    verifyWalletLogin: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { publicKey?: string; signature?: string; userId?: string };
      if (!body.publicKey || !body.signature) throw new ValidationError(["publicKey and signature required"]);
      sendJson(res, 200, service.verifyWalletLogin({ publicKey: body.publicKey, signature: body.signature, userId: body.userId ?? readHeader(req, "x-user-id") }));
    },
    listWallets: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { wallets: service.listWallets(requireUserId(req)) }),
    setPrimaryWallet: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { publicKey?: string };
      if (!body.publicKey) throw new ValidationError(["publicKey required"]);
      sendJson(res, 200, { wallet: service.setPrimaryWallet(requireUserId(req), body.publicKey) });
    },
    dashboard: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, service.getDashboard(requireUserId(req))),
    submitReview: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as { placeId?: string; videoUrl?: string; contentHash?: string; qualityRating?: "low"|"standard"|"high"|"featured"; videoId?: string; creatorProfileId?: string; reviewId?: string };
      if (!body.placeId || !body.videoUrl || !body.contentHash) throw new ValidationError(["placeId, videoUrl, contentHash required"]);
      sendJson(res, 201, { review: service.submitReview({ userId: requireUserId(req), placeId: body.placeId, videoUrl: body.videoUrl, contentHash: body.contentHash, qualityRating: body.qualityRating, videoId: body.videoId, creatorProfileId: body.creatorProfileId, reviewId: body.reviewId }) });
    },
    approveReview: async (req: IncomingMessage, res: ServerResponse, reviewId: string) => {
      const body = await parseJsonBody(req) as { qualityRating?: "low"|"standard"|"high"|"featured"; adminDistinctRewardSlotEnabled?: boolean };
      sendJson(res, 200, { review: service.approveReview({ reviewId, actorUserId: requireUserId(req), qualityRating: body.qualityRating, adminDistinctRewardSlotEnabled: body.adminDistinctRewardSlotEnabled }) });
    },
    rejectReview: async (req: IncomingMessage, res: ServerResponse, reviewId: string) => {
      const body = await parseJsonBody(req) as { reason?: string };
      sendJson(res, 200, { review: service.rejectReview({ reviewId, actorUserId: requireUserId(req), reason: body.reason ?? "rejected" }) });
    },
    claim: async (req: IncomingMessage, res: ServerResponse, rewardId: string) => {
      const body = await parseJsonBody(req) as { walletPublicKey?: string; idempotencyKey?: string };
      if (!body.walletPublicKey) throw new ValidationError(["walletPublicKey required"]);
      sendJson(res, 200, await service.claimReward({ userId: requireUserId(req), reviewId: rewardId, walletPublicKey: body.walletPublicKey, idempotencyKey: body.idempotencyKey }));
    },
    auditLogs: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { logs: service.listAuditLogs() }),
    rewardTiers: async (_req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { rewardTiers: service.listRewardTiers() })
  };
}
