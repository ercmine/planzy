import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
function sessionTokenFromRequest(req) {
    const authHeader = readHeader(req, "authorization");
    if (authHeader?.toLowerCase().startsWith("bearer "))
        return authHeader.slice(7).trim();
    return readHeader(req, "x-session-token") ?? undefined;
}
function mapError(res, error) {
    if (error instanceof ValidationError) {
        sendJson(res, 400, { error: "validation_error", details: error.details });
        return;
    }
    throw error;
}
export function createWalletAuthHttpHandlers(service) {
    return {
        createChallenge: async (req, res) => {
            try {
                const body = await parseJsonBody(req);
                if (!body.chain || !body.provider || !body.address)
                    throw new ValidationError(["chain, provider, and address are required"]);
                const result = service.createChallenge({
                    chain: body.chain,
                    provider: body.provider,
                    address: body.address,
                    intent: body.intent,
                    sessionToken: sessionTokenFromRequest(req)
                });
                sendJson(res, 200, result);
            }
            catch (error) {
                mapError(res, error);
            }
        },
        verifyChallenge: async (req, res) => {
            try {
                const body = await parseJsonBody(req);
                if (!body.challengeId || !body.signature || !body.address)
                    throw new ValidationError(["challengeId, signature, and address are required"]);
                const result = await service.verifyChallenge({
                    challengeId: body.challengeId,
                    signature: body.signature,
                    address: body.address,
                    sessionToken: sessionTokenFromRequest(req)
                });
                sendJson(res, 200, result);
            }
            catch (error) {
                mapError(res, error);
            }
        },
        restoreSession: async (req, res) => {
            sendJson(res, 200, service.restoreSession(sessionTokenFromRequest(req)));
        },
        logout: async (req, res) => {
            sendJson(res, 200, service.logout(sessionTokenFromRequest(req)));
        },
        listWallets: async (req, res) => {
            try {
                const token = sessionTokenFromRequest(req);
                if (!token)
                    throw new ValidationError(["session_required"]);
                sendJson(res, 200, { wallets: service.listWalletsForSession(token) });
            }
            catch (error) {
                mapError(res, error);
            }
        },
        verificationEvents: async (_req, res) => {
            sendJson(res, 200, { events: service.getVerificationEvents() });
        }
    };
}
