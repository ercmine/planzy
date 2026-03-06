import type { IncomingMessage, ServerResponse } from "node:http";

import { ValidationError } from "../plans/errors.js";
import { createVenueClaimsHttpHandlers, sendJson } from "../venues/claims/http.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";

export function applyCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
}

export function createRoutes(service: VenueClaimsService) {
  const handlers = createVenueClaimsHttpHandlers(service);

  return async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    applyCors(res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);

    try {
      if (req.method === "POST" && url.pathname === "/v1/venue-claims") {
        await handlers.handleCreate(req, res);
        return;
      }

      if (req.method === "GET" && url.pathname === "/v1/venue-claims") {
        await handlers.handleList(req, res);
        return;
      }

      const patchMatch = /^\/v1\/venue-claims\/([^/]+)\/status$/.exec(url.pathname);
      if (req.method === "PATCH" && patchMatch) {
        await handlers.handlePatchStatus(req, res, decodeURIComponent(patchMatch[1]));
        return;
      }

      sendJson(res, 404, { error: "Not Found" });
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message, details: error.details });
        return;
      }

      sendJson(res, 500, { error: "Internal Server Error" });
    }
  };
}
