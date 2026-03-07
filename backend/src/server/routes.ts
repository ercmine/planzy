import type { IncomingMessage, ServerResponse } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import { handleMerchantHttpError, createMerchantHttpHandlers } from "../merchant/http.js";
import type { MerchantService } from "../merchant/service.js";
import { ValidationError } from "../plans/errors.js";
import { createVenueClaimsHttpHandlers, readHeader, sendJson } from "../venues/claims/http.js";
import type { VenueClaimsService } from "../venues/claims/claimsService.js";

export function applyCors(res: ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-user-id, x-admin-key, x-request-id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
}

function assertAdmin(req: IncomingMessage): boolean {
  const expectedKey = process.env.ADMIN_API_KEY;
  if (!expectedKey) return false;
  return readHeader(req, "x-admin-key") === expectedKey;
}

export function createRoutes(
  service: VenueClaimsService,
  merchantService: MerchantService,
  deps?: { deckHandler?: SessionDeckHandler }
) {
  const handlers = createVenueClaimsHttpHandlers(service);
  const merchantHandlers = createMerchantHttpHandlers(merchantService);

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
      const deckRouteMatch = /^\/sessions\/([^/]+)\/deck$/.exec(url.pathname);
      if (req.method === "GET" && deckRouteMatch) {
        if (!deps?.deckHandler) {
          sendJson(res, 503, { error: "deck_unavailable" });
          return;
        }

        await deps.deckHandler(req, res, { sessionId: decodeURIComponent(deckRouteMatch[1] ?? "") });
        return;
      }

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

      if (url.pathname.startsWith("/v1/admin/")) {
        if (!assertAdmin(req)) {
          sendJson(res, 401, { error: "Unauthorized" });
          return;
        }

        if (req.method === "POST" && url.pathname === "/v1/admin/promoted") {
          await merchantHandlers.createPromoted(req, res);
          return;
        }

        if (req.method === "GET" && url.pathname === "/v1/admin/promoted") {
          await merchantHandlers.listPromoted(req, res);
          return;
        }

        if (req.method === "PATCH" && /^\/v1\/admin\/promoted\/[^/]+$/.test(url.pathname)) {
          await merchantHandlers.patchPromoted(req, res);
          return;
        }

        if (req.method === "DELETE" && /^\/v1\/admin\/promoted\/[^/]+$/.test(url.pathname)) {
          await merchantHandlers.deletePromoted(req, res);
          return;
        }

        if (req.method === "POST" && url.pathname === "/v1/admin/specials") {
          await merchantHandlers.createSpecial(req, res);
          return;
        }

        if (req.method === "GET" && url.pathname === "/v1/admin/specials") {
          await merchantHandlers.listSpecials(req, res);
          return;
        }

        if (req.method === "PATCH" && /^\/v1\/admin\/specials\/[^/]+$/.test(url.pathname)) {
          await merchantHandlers.patchSpecial(req, res);
          return;
        }

        if (req.method === "DELETE" && /^\/v1\/admin\/specials\/[^/]+$/.test(url.pathname)) {
          await merchantHandlers.deleteSpecial(req, res);
          return;
        }
      }

      sendJson(res, 404, { error: "Not Found" });
    } catch (error) {
      if (url.pathname.startsWith("/v1/admin/")) {
        handleMerchantHttpError(res, error);
        return;
      }

      if (error instanceof ValidationError) {
        sendJson(res, 400, { error: error.message, details: error.details });
        return;
      }

      sendJson(res, 500, { error: "Internal Server Error" });
    }
  };
}
