import type { IncomingMessage, ServerResponse } from "node:http";

import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import type { GeoGateway } from "./gateway.js";
import type { GeoBounds, GeoGeocodeRequest, GeoResult, GeoReverseResult, PerbugGeoPlace } from "./contracts.js";
import { assertGeoAuth } from "./middleware.js";

interface RateLimitOptions {
  maxRequestsPerMinute: number;
}

class InMemoryGeoRateLimiter {
  private readonly windows = new Map<string, { count: number; resetAtMs: number }>();

  constructor(private readonly options: RateLimitOptions) {}

  allow(key: string): boolean {
    const now = Date.now();
    const existing = this.windows.get(key);
    if (!existing || now >= existing.resetAtMs) {
      this.windows.set(key, { count: 1, resetAtMs: now + 60_000 });
      return true;
    }
    if (existing.count >= this.options.maxRequestsPerMinute) {
      return false;
    }
    existing.count += 1;
    return true;
  }
}

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBounds(body: Record<string, unknown>): GeoBounds | undefined {
  const north = toNumber(body.north);
  const south = toNumber(body.south);
  const east = toNumber(body.east);
  const west = toNumber(body.west);
  if ([north, south, east, west].some((item) => item === undefined)) return undefined;
  return { north: north!, south: south!, east: east!, west: west! };
}

function normalizePlace(result: GeoResult | GeoReverseResult, index: number): PerbugGeoPlace {
  const shortAddress = [result.city, result.state, result.country].filter(Boolean).join(", ") || undefined;
  const bounds = result.boundingBox
    ? { south: result.boundingBox[0], north: result.boundingBox[1], west: result.boundingBox[2], east: result.boundingBox[3] }
    : undefined;

  const base = `${(result.displayName ?? "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${result.lat.toFixed(4)}-${result.lng.toFixed(4)}-${index}`;

  return {
    id: `geo:${base}`,
    name: result.displayName.split(",")[0]?.trim() || result.displayName,
    displayName: result.displayName,
    shortAddress,
    lat: result.lat,
    lon: result.lng,
    boundingBox: bounds,
    category: result.class,
    subcategory: result.type,
    city: result.city,
    region: result.state,
    country: result.country,
    postcode: result.postalCode,
    source: "nominatim",
    confidence: result.confidence,
    importance: result.importance,
    osm: { canonicalKey: base },
    match: {
      knownPlace: false,
      rewardEnabled: false,
      sponsored: false,
      hasReviews: false,
      checkInEligible: false
    }
  };
}

export function createGeoHttpHandlers(gateway: GeoGateway, options: { authSecret?: string; rateLimitPerMinute?: number } = {}) {
  const limiter = new InMemoryGeoRateLimiter({ maxRequestsPerMinute: Math.max(30, options.rateLimitPerMinute ?? 180) });

  const requireAuth = (req: IncomingMessage): boolean => {
    try {
      assertGeoAuth(req, options.authSecret);
      return true;
    } catch {
      return false;
    }
  };

  const guardPublicEndpoint = (req: IncomingMessage, res: ServerResponse): boolean => {
    const source = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? "unknown";
    if (!limiter.allow(source)) {
      sendJson(res, 429, { error: "geo_rate_limited", message: "Too many geo requests. Please retry shortly." });
      return false;
    }
    return true;
  };

  return {
    async geocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
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
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
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

    async apiSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const query = String(url.searchParams.get("q") ?? "").trim();
        if (!query || query.length < 2) {
          sendJson(res, 400, { error: "invalid_query", message: "q must be at least 2 characters" });
          return;
        }
        const request: GeoGeocodeRequest = {
          query,
          limit: toNumber(url.searchParams.get("limit")) ?? 8,
          language: url.searchParams.get("language") ?? undefined,
          countryCodes: (url.searchParams.get("countryCodes") ?? "").split(",").map((v) => v.trim()).filter(Boolean),
          bounds: parseBounds(Object.fromEntries(url.searchParams.entries()))
        };
        const results = await gateway.geocode(request);
        sendJson(res, 200, { results: results.map(normalizePlace) });
      } catch (error) {
        sendJson(res, 502, { error: "geo_search_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async apiReverse(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const lat = toNumber(url.searchParams.get("lat"));
        const lng = toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"));
        if (lat === undefined || lng === undefined) {
          sendJson(res, 400, { error: "invalid_coordinates", message: "lat and lon are required numbers" });
          return;
        }
        const result = await gateway.reverseGeocode({ lat, lng, language: url.searchParams.get("language") ?? undefined });
        sendJson(res, 200, { result: normalizePlace(result, 0) });
      } catch (error) {
        sendJson(res, 502, { error: "geo_reverse_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async apiAutocomplete(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const query = String(url.searchParams.get("q") ?? "").trim();
        if (!query || query.length < 2) {
          sendJson(res, 400, { error: "invalid_query", message: "q must be at least 2 characters" });
          return;
        }
        const suggestions = await gateway.autocomplete({
          query,
          limit: toNumber(url.searchParams.get("limit")) ?? 8,
          language: url.searchParams.get("language") ?? undefined,
          bounds: parseBounds(Object.fromEntries(url.searchParams.entries())),
          bias: {
            lat: toNumber(url.searchParams.get("lat")),
            lng: toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"))
          }
        });
        sendJson(res, 200, { suggestions });
      } catch (error) {
        sendJson(res, 502, { error: "geo_autocomplete_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async autocomplete(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const suggestions = await gateway.autocomplete({
          query: String(body.q ?? body.query ?? ""),
          limit: body.limit ? Number(body.limit) : undefined,
          language: body.language ? String(body.language) : undefined,
          bias: {
            lat: body.lat ? Number(body.lat) : undefined,
            lng: body.lng ? Number(body.lng) : undefined,
            city: body.city ? String(body.city) : undefined,
            region: body.region ? String(body.region) : undefined,
            countryCode: body.countryCode ? String(body.countryCode) : undefined
          }
        });
        sendJson(res, 200, { suggestions });
      } catch (error) {
        sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async placeLookup(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const candidates = await gateway.placeLookup({
          query: String(body.q ?? body.query ?? ""),
          limit: body.limit ? Number(body.limit) : undefined,
          language: body.language ? String(body.language) : undefined
        });
        sendJson(res, 200, { candidates });
      } catch (error) {
        sendJson(res, 502, { error: "geo_upstream_error", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async areaContext(req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const context = await gateway.areaContext({
          lat: Number(body.lat),
          lng: Number(body.lng),
          language: body.language ? String(body.language) : undefined
        });
        sendJson(res, 200, { context });
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
    },

    async metrics(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      const payload = await gateway.health();
      sendJson(res, 200, { service: "perbug-geo", metrics: payload.metrics ?? null, upstream: payload.upstream ?? null });
    }
  };
}
