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
      const body = await parseJsonBody(req) as { senderWalletPublicKey?: string; amountAtomic?: string; note?: string };
      if (!body.senderWalletPublicKey || !body.amountAtomic) throw new ValidationError(["senderWalletPublicKey and amountAtomic required"]);
      const tip = await service.createVideoTipIntent({ videoId, senderUserId: requireUserId(req), senderWalletPublicKey: body.senderWalletPublicKey, amountAtomic: BigInt(body.amountAtomic), note: body.note, allowSelfTip: String(process.env.PERBUG_ALLOW_SELF_TIP ?? "false") === "true" });
      sendJson(res, 201, { tipIntent: tip });
    },
    submit: async (req: IncomingMessage, res: ServerResponse, tipIntentId: string) => sendJson(res, 200, { tipIntent: await service.submitTip({ tipIntentId, senderUserId: requireUserId(req) }) }),
    listVideo: async (_req: IncomingMessage, res: ServerResponse, videoId: string) => sendJson(res, 200, { items: service.listTipsByVideo(videoId), summary: service.summarizeVideo(videoId) }),
    creatorSummary: async (_req: IncomingMessage, res: ServerResponse, creatorUserId: string) => sendJson(res, 200, { summary: service.summarizeCreator(creatorUserId), items: service.listReceivedTips(creatorUserId) }),
    sent: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { items: service.listSentTips(requireUserId(req)) }),
    received: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { items: service.listReceivedTips(requireUserId(req)) })
  };
}
