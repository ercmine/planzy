import type { IncomingMessage, ServerResponse } from "node:http";

import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import type { GeoGateway } from "./gateway.js";

export function createGeoHttpHandlers(gateway: GeoGateway) {
  return {
    async geocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const body = req.method === "GET"
          ? Object.fromEntries(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.entries())
          : (await parseJsonBody(req)) as Record<string, unknown>;

        const countryCodes = typeof body.countryCodes === "string"
          ? body.countryCodes.split(",").map((v) => v.trim()).filter(Boolean)
          : Array.isArray(body.countryCodes) ? body.countryCodes.map((value) => String(value)) : undefined;

        const results = await gateway.geocode({
          query: String(body.q ?? body.query ?? ""),
          limit: body.limit ? Number(body.limit) : undefined,
          language: body.language ? String(body.language) : undefined,
          countryCodes
        });
        sendJson(res, 200, { results });
      } catch (error) {
        sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async reverseGeocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      try {
        const body = req.method === "GET"
          ? Object.fromEntries(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.entries())
          : (await parseJsonBody(req)) as Record<string, unknown>;

        const result = await gateway.reverseGeocode({
          lat: Number(body.lat),
          lng: Number(body.lng),
          zoom: body.zoom ? Number(body.zoom) : undefined,
          language: body.language ? String(body.language) : undefined
        });
        sendJson(res, 200, { result });
      } catch (error) {
        sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async health(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      const payload = await gateway.health();
      sendJson(res, payload.ok ? 200 : 503, payload);
    },

    async ready(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      const payload = await gateway.health();
      sendJson(res, payload.ok ? 200 : 503, { ok: payload.ok, ready: payload.ok, mode: payload.mode });
    },

    async version(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      sendJson(res, 200, { service: "perbug-geo", version: "1.0.0" });
    }
  };
}
