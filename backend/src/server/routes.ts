import type { IncomingMessage, ServerResponse } from "node:http";

import type { SessionDeckHandler } from "../api/sessions/deckHandler.js";
import type { SessionIdeasHandlers } from "../api/sessions/ideasHandler.js";
import { handleMerchantHttpError, createMerchantHttpHandlers } from "../merchant/http.js";
import type { MerchantService } from "../merchant/service.js";
import { ValidationError } from "../plans/errors.js";
import { createTelemetryHttpHandlers } from "../telemetry/http.js";
import type { TelemetryService } from "../telemetry/telemetryService.js";
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
  deps?: { deckHandler?: SessionDeckHandler; ideasHandlers?: SessionIdeasHandlers; telemetryService?: TelemetryService }
) {
  const handlers = createVenueClaimsHttpHandlers(service);
  const merchantHandlers = createMerchantHttpHandlers(merchantService);
  const telemetryHandlers = deps?.telemetryService ? createTelemetryHttpHandlers(deps.telemetryService) : null;

  return async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    applyCors(res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);
    const normalizedPath = normalizeAliasPath(url.pathname);

    try {
      if (req.method === "GET" && normalizedPath === "/") {
        sendJson(res, 200, {
          service: "perbug-api",
          version: "1.0.0"
        });
        return;
      }

      if (req.method === "GET" && normalizedPath === "/health") {
        sendJson(res, 200, {
          ok: true,
          service: "perbug-api",
          time: new Date().toISOString()
        });
        return;
      }

      if (req.method === "GET" && normalizedPath === "/plans") {
        sendJson(res, 200, [
          {
            id: "sample-plan-1",
            title: "Coffee walk",
            category: "coffee",
            source: "stub"
          }
        ]);
        return;
      }

      if (req.method === "GET" && normalizedPath === "/live-results") {
        sendJson(res, 200, {
          results: [
            {
              sessionId: "demo-session",
              topPlanId: "sample-plan-1",
              topPlanTitle: "Coffee walk",
              score: 0.91
            }
          ],
          summary: {
            activeSessions: 1,
            generatedAt: new Date().toISOString()
          }
        });
        return;
      }

      const deckRouteMatch = /^\/sessions\/([^/]+)\/deck$/.exec(normalizedPath);
      if (req.method === "GET" && deckRouteMatch) {
        if (!deps?.deckHandler) {
          sendJson(res, 503, { error: "deck_unavailable" });
          return;
        }

        await deps.deckHandler(req, res, { sessionId: decodeURIComponent(deckRouteMatch[1] ?? "") });
        return;
      }

      const telemetryIngestMatch = /^\/sessions\/([^/]+)\/telemetry$/.exec(normalizedPath);
      if (telemetryIngestMatch && telemetryHandlers) {
        const sessionId = decodeURIComponent(telemetryIngestMatch[1] ?? "");
        if (req.method === "POST") {
          await telemetryHandlers.ingest(req, res, sessionId);
          return;
        }
        if (req.method === "GET") {
          await telemetryHandlers.list(req, res, sessionId);
          return;
        }
      }

      const telemetryAggregateMatch = /^\/sessions\/([^/]+)\/telemetry\/aggregate$/.exec(normalizedPath);
      if (telemetryAggregateMatch && telemetryHandlers && req.method === "GET") {
        await telemetryHandlers.aggregate(req, res, decodeURIComponent(telemetryAggregateMatch[1] ?? ""));
        return;
      }

      const listOrCreateIdeasMatch = /^\/sessions\/([^/]+)\/ideas$/.exec(normalizedPath);
      if (listOrCreateIdeasMatch && deps?.ideasHandlers) {
        const sessionId = decodeURIComponent(listOrCreateIdeasMatch[1] ?? "");

        if (req.method === "POST") {
          await deps.ideasHandlers.postIdea(req, res, { sessionId });
          return;
        }

        if (req.method === "GET") {
          await deps.ideasHandlers.listIdeas(req, res, { sessionId });
          return;
        }
      }

      const deleteIdeaMatch = /^\/sessions\/([^/]+)\/ideas\/([^/]+)$/.exec(normalizedPath);
      if (req.method === "DELETE" && deleteIdeaMatch && deps?.ideasHandlers) {
        await deps.ideasHandlers.deleteIdea(req, res, {
          sessionId: decodeURIComponent(deleteIdeaMatch[1] ?? ""),
          ideaId: decodeURIComponent(deleteIdeaMatch[2] ?? "")
        });
        return;
      }

      if (req.method === "POST" && normalizedPath === "/v1/venue-claims") {
        await handlers.handleCreate(req, res);
        return;
      }

      if (req.method === "GET" && normalizedPath === "/v1/venue-claims") {
        await handlers.handleList(req, res);
        return;
      }

      const patchMatch = /^\/v1\/venue-claims\/([^/]+)\/status$/.exec(normalizedPath);
      if (req.method === "PATCH" && patchMatch) {
        await handlers.handlePatchStatus(req, res, decodeURIComponent(patchMatch[1]));
        return;
      }

      if (normalizedPath.startsWith("/v1/admin/")) {
        if (!assertAdmin(req)) {
          sendJson(res, 401, { error: "Unauthorized" });
          return;
        }

        if (req.method === "POST" && normalizedPath === "/v1/admin/promoted") {
          await merchantHandlers.createPromoted(req, res);
          return;
        }

        if (req.method === "GET" && normalizedPath === "/v1/admin/promoted") {
          await merchantHandlers.listPromoted(req, res);
          return;
        }

        if (req.method === "PATCH" && /^\/v1\/admin\/promoted\/[^/]+$/.test(normalizedPath)) {
          await merchantHandlers.patchPromoted(req, res);
          return;
        }

        if (req.method === "DELETE" && /^\/v1\/admin\/promoted\/[^/]+$/.test(normalizedPath)) {
          await merchantHandlers.deletePromoted(req, res);
          return;
        }

        if (req.method === "POST" && normalizedPath === "/v1/admin/specials") {
          await merchantHandlers.createSpecial(req, res);
          return;
        }

        if (req.method === "GET" && normalizedPath === "/v1/admin/specials") {
          await merchantHandlers.listSpecials(req, res);
          return;
        }

        if (req.method === "PATCH" && /^\/v1\/admin\/specials\/[^/]+$/.test(normalizedPath)) {
          await merchantHandlers.patchSpecial(req, res);
          return;
        }

        if (req.method === "DELETE" && /^\/v1\/admin\/specials\/[^/]+$/.test(normalizedPath)) {
          await merchantHandlers.deleteSpecial(req, res);
          return;
        }
      }

      sendJson(res, 404, { error: "Not Found" });
    } catch (error) {
      if (normalizedPath.startsWith("/v1/admin/")) {
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

function normalizeAliasPath(pathname: string): string {
  if (pathname === "/api" || pathname === "/v1") {
    return "/";
  }

  if (pathname.startsWith("/api/")) {
    return pathname.slice("/api".length);
  }

  const v1AliasPaths = ["/plans", "/live-results", "/health"];
  if (pathname.startsWith("/v1/")) {
    const withoutPrefix = pathname.slice("/v1".length);
    if (v1AliasPaths.some((aliasPath) => withoutPrefix === aliasPath || withoutPrefix.startsWith(`${aliasPath}/`))) {
      return withoutPrefix;
    }
  }

  return pathname;
}
