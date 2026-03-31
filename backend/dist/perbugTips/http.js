import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function requireUserId(req) {
    const userId = readHeader(req, "x-user-id");
    if (!userId)
        throw new ValidationError(["x-user-id header is required"]);
    return userId;
}
export function createPerbugTipsHttpHandlers(service) {
    return {
        createIntent: async (req, res, videoId) => {
            const body = await parseJsonBody(req);
            if (!body.senderWalletAddress || !body.amountWei)
                throw new ValidationError(["senderWalletAddress and amountWei required"]);
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
        submit: async (req, res, tipIntentId) => sendJson(res, 200, { tipIntent: await service.submitTip({ tipIntentId, senderUserId: requireUserId(req) }) }),
        listVideo: async (_req, res, videoId) => sendJson(res, 200, { items: service.listTipsByVideo(videoId), summary: service.summarizeVideo(videoId) }),
        creatorSummary: async (_req, res, creatorUserId) => sendJson(res, 200, { summary: service.summarizeCreator(creatorUserId), items: service.listReceivedTips(creatorUserId) }),
        sent: async (req, res) => sendJson(res, 200, { items: service.listSentTips(requireUserId(req)) }),
        received: async (req, res) => sendJson(res, 200, { items: service.listReceivedTips(requireUserId(req)) })
    };
}
