import type { IncomingMessage, ServerResponse } from "node:http";

import { GeocodingError } from "./errors.js";
import type { GeocodingService } from "./service.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";

export function createGeocodingHttpHandlers(service: GeocodingService) {
  return {
    async geocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        if (req.method === "GET") {
          const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
          const query = url.searchParams.get("q") ?? "";
          const limit = Number(url.searchParams.get("limit") ?? "5");
          const language = url.searchParams.get("language") ?? undefined;
          const countryCodes = (url.searchParams.get("countryCodes") ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
          sendJson(res, 200, { results: await service.geocode({ query, limit, language, countryCodes }) });
          return;
        }

        const body = (await parseJsonBody(req)) as { query?: string; limit?: number; language?: string; countryCodes?: string[] };
        sendJson(res, 200, { results: await service.geocode({ query: body.query ?? "", limit: body.limit, language: body.language, countryCodes: body.countryCodes }) });
      } catch (error) {
        sendError(res, error);
      }
    },
    async reverseGeocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        if (req.method === "GET") {
          const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
          const lat = Number(url.searchParams.get("lat"));
          const lng = Number(url.searchParams.get("lng"));
          const zoom = url.searchParams.get("zoom");
          const language = url.searchParams.get("language") ?? undefined;
          sendJson(res, 200, { result: await service.reverseGeocode({ lat, lng, zoom: zoom ? Number(zoom) : undefined, language }) });
          return;
        }

        const body = (await parseJsonBody(req)) as { lat?: number; lng?: number; zoom?: number; language?: string };
        sendJson(res, 200, { result: await service.reverseGeocode({ lat: body.lat ?? Number.NaN, lng: body.lng ?? Number.NaN, zoom: body.zoom, language: body.language }) });
      } catch (error) {
        sendError(res, error);
      }
    },
    async health(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      const provider = await service.health();
      sendJson(res, provider.ok ? 200 : 503, { ok: provider.ok, provider, metrics: service.metricsSnapshot() });
    },
  };
}

function sendError(res: ServerResponse, error: unknown): void {
  if (error instanceof GeocodingError) {
    sendJson(res, error.statusCode, { error: error.code, message: error.message });
    return;
  }
  sendJson(res, 500, { error: "internal_error", message: error instanceof Error ? error.message : String(error) });
}
