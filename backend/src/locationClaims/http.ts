import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { parseJsonBody, readHeader, sendJson } from "../venues/claims/http.js";
import type { LocationClaimsService } from "./service.js";

function requireUser(req: IncomingMessage): string {
  const userId = readHeader(req, "x-user-id");
  if (!userId) throw new ValidationError(["x-user-id is required"]);
  return userId;
}

export function createLocationClaimsHttpHandlers(service: LocationClaimsService) {
  return {
    nearby: async (req: IncomingMessage, res: ServerResponse, url: URL) => {
      const userId = requireUser(req);
      const lat = Number(url.searchParams.get("lat") ?? "0");
      const lng = Number(url.searchParams.get("lng") ?? "0");
      sendJson(res, 200, { locations: service.listNearbyClaimables({ userId, lat, lng }) });
    },
    registerVisit: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 201, {
        visit: service.registerVisit({
          userId: requireUser(req),
          locationId: String(body.locationId ?? ""),
          lat: Number(body.lat ?? 0),
          lng: Number(body.lng ?? 0),
          accuracyMeters: Number(body.accuracyMeters ?? 0)
        })
      });
    },
    prepareClaim: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 200, {
        adGate: service.prepareAdGate({
          userId: requireUser(req),
          locationId: String(body.locationId ?? ""),
          visitId: String(body.visitId ?? "")
        })
      });
    },
    completeAd: async (_req: IncomingMessage, res: ServerResponse, adSessionId: string) => sendJson(res, 200, { adGate: service.markAdCompleted(adSessionId) }),
    finalizeClaim: async (req: IncomingMessage, res: ServerResponse) => {
      const body = await parseJsonBody(req) as Record<string, unknown>;
      sendJson(res, 200, {
        claim: await service.finalizeClaim({
          userId: requireUser(req),
          locationId: String(body.locationId ?? ""),
          visitId: String(body.visitId ?? ""),
          adSessionId: String(body.adSessionId ?? ""),
          idempotencyKey: String(body.idempotencyKey ?? ""),
          payoutAddress: String(body.payoutAddress ?? ""),
        })
      });
    },
    history: async (req: IncomingMessage, res: ServerResponse) => sendJson(res, 200, { claims: service.getUserHistory(requireUser(req)) }),
    pool: async (_req: IncomingMessage, res: ServerResponse, url: URL) => {
      const year = Number(url.searchParams.get("year") ?? new Date().getUTCFullYear());
      sendJson(res, 200, { pool: service.getPoolStats(year) });
    }
  };
}
