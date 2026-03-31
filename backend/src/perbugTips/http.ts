import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import { PerbugTipsService } from "./service.js";

function requireUserId(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id header is required"]);
  return userId;
}

export function createPerbugTipsHttpHandlers(service: PerbugTipsService) {
  return {
    createIntent: async (req: IncomingMessage, res: ServerResponse, videoId: string) => {
      const body = await parseJsonBody(req) as { senderWalletAddress?: string; amountWei?: string; note?: string; tipKind?: "water_tree" | "direct_eth" };
      if (!body.senderWalletAddress || !body.amountWei) throw new ValidationError(["senderWalletAddress and amountWei required"]);
      const tip = await service.createVideoTipIntent({
        videoId,
        senderUserId: requireUserId(req),
        senderWalletAddress: body.senderWalletAddress,
        amountWei: BigInt(body.amountWei),
        note: body.note,
        tipKind: body.tipKind ?? "water_tree",
        allowSelfTip: String(process.env.PERBUG_ALLOW_SELF_TIP ?? "false") === "true"
      });
      sendJson(res, 201, { tipIntent: tip });
    },
    submit: async (req: IncomingMessage, res: ServerResponse, tipIntentId: string) => sendJson(res, 200, { tipIntent: await service.submitTip({ tipIntentId, senderUserId: requireUserId(req) }) }),
    listVideo: async (_req: IncomingMessage, res: ServerResponse, videoId: string) => sendJson(res, 200, { items: service.listTipsByVideo(videoId), summary: service.summarizeVideo(videoId) }),
    creatorSummary: async (_req: IncomingMessage, res: ServerResponse, creatorUserId: string) => sendJson(res, 200, { summary: service.summarizeCreator(creatorUserId), items: service.listReceivedTips(creatorUserId) }),
    sent: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { items: service.listSentTips(requireUserId(req)) }),
    received: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { items: service.listReceivedTips(requireUserId(req)) })
  };
}
