import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { WalletAuthService } from "./service.js";
import type { WalletChain, WalletProvider } from "./types.js";

function sessionTokenFromRequest(req: IncomingMessage): string | undefined {
  const authHeader = readHeader(req, "authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) return authHeader.slice(7).trim();
  return readHeader(req, "x-session-token") ?? undefined;
}

function mapError(res: ServerResponse, error: unknown): void {
  if (error instanceof ValidationError) {
    sendJson(res, 400, { error: "validation_error", details: error.details });
    return;
  }
  throw error;
}

export function createWalletAuthHttpHandlers(service: WalletAuthService) {
  return {
    createChallenge: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody(req) as { chain?: WalletChain; provider?: WalletProvider; address?: string; intent?: "login" | "link" };
        if (!body.chain || !body.provider || !body.address) throw new ValidationError(["chain, provider, and address are required"]);
        const result = service.createChallenge({
          chain: body.chain,
          provider: body.provider,
          address: body.address,
          intent: body.intent,
          sessionToken: sessionTokenFromRequest(req)
        });
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },

    verifyChallenge: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const body = await parseJsonBody(req) as { challengeId?: string; signature?: string; address?: string };
        if (!body.challengeId || !body.signature || !body.address) throw new ValidationError(["challengeId, signature, and address are required"]);
        const result = await service.verifyChallenge({
          challengeId: body.challengeId,
          signature: body.signature,
          address: body.address,
          sessionToken: sessionTokenFromRequest(req)
        });
        sendJson(res, 200, result);
      } catch (error) {
        mapError(res, error);
      }
    },

    restoreSession: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.restoreSession(sessionTokenFromRequest(req)));
    },

    logout: async (req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, service.logout(sessionTokenFromRequest(req)));
    },

    listWallets: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const token = sessionTokenFromRequest(req);
        if (!token) throw new ValidationError(["session_required"]);
        sendJson(res, 200, { wallets: service.listWalletsForSession(token) });
      } catch (error) {
        mapError(res, error);
      }
    },

    verificationEvents: async (_req: IncomingMessage, res: ServerResponse) => {
      sendJson(res, 200, { events: service.getVerificationEvents() });
    }
  };
}
