import type { IncomingMessage, ServerResponse } from "node:http";

import { searchCanonicalPlacesInBounds } from "../places/mapDiscovery.js";
import type { CanonicalPlace } from "../places/types.js";
import { parseJsonBody, sendJson } from "../venues/claims/http.js";
import type { GeoGateway } from "./gateway.js";
import type { GeoBounds, GeoGeocodeRequest, GeoResult, GeoReverseResult, PerbugGeoPlace } from "./contracts.js";
import { assertGeoAuth } from "./middleware.js";

interface RateLimitOptions {
  maxRequestsPerMinute: number;
}

export interface GeoRuntimeStatus {
  mode: "remote" | "local" | "disabled";
  routesMounted: boolean;
  upstreamBaseUrl?: string;
  envValidationErrors: string[];
  envValidationWarnings: string[];
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
  const boundingBox = "boundingBox" in result ? result.boundingBox : undefined;
  const bounds = boundingBox
    ? { south: boundingBox[0], north: boundingBox[1], west: boundingBox[2], east: boundingBox[3] }
    : undefined;
  const importance = "importance" in result ? result.importance : undefined;

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
    importance,
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

function toBoundsFromRadius(lat: number, lng: number, radiusMeters: number): GeoBounds {
  const latDelta = radiusMeters / 111_000;
  const lngDelta = radiusMeters / (111_000 * Math.max(Math.cos((lat * Math.PI) / 180), 0.15));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta
  };
}

function normalizeCanonicalPlace(place: ReturnType<typeof searchCanonicalPlacesInBounds>[number]): PerbugGeoPlace {
  return {
    id: place.canonicalPlaceId,
    name: place.name,
    displayName: place.name,
    shortAddress: [place.city, place.region].filter(Boolean).join(", ") || undefined,
    lat: place.latitude,
    lon: place.longitude,
    category: place.category,
    city: place.city,
    region: place.region,
    source: "nominatim",
    importance: place.rating,
    match: {
      knownPlace: true,
      internalPlaceId: place.canonicalPlaceId,
      rewardEnabled: false,
      sponsored: false,
      hasReviews: place.reviewCount > 0,
      checkInEligible: true
    }
  };
}

function geoUnavailablePayload(status: GeoRuntimeStatus) {
  return {
    error: "geo_unavailable",
    message: "Geo service is not configured on this deployment.",
    status
  };
}

export function createGeoHttpHandlers(
  gateway: GeoGateway | null,
  options: {
    authSecret?: string;
    rateLimitPerMinute?: number;
    listCanonicalPlaces?: () => CanonicalPlace[];
    getStatus?: () => GeoRuntimeStatus;
  } = {}
) {
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

  const status = () => options.getStatus?.() ?? {
    mode: gateway ? "remote" : "disabled",
    routesMounted: true,
    envValidationErrors: gateway ? [] : ["geo gateway unavailable"],
    envValidationWarnings: []
  };

  const getGatewayOrRespond = (res: ServerResponse): GeoGateway | null => {
    if (gateway) return gateway;
    sendJson(res, 503, geoUnavailablePayload(status()));
    return null;
  };

  return {
    async geocode(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
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

        const results = await activeGateway.geocode({
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
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = req.method === "GET"
          ? Object.fromEntries(new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`).searchParams.entries())
          : (await parseJsonBody(req)) as Record<string, unknown>;

        const result = await activeGateway.reverseGeocode({
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
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
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
        const startedAt = Date.now();
        const results = await activeGateway.geocode(request);
        console.info("[geo.api.search]", { query, limit: request.limit, resultCount: results.length, latencyMs: Date.now() - startedAt });
        sendJson(res, 200, { results: results.map(normalizePlace) });
      } catch (error) {
        console.warn("[geo.api.search.error]", { error: error instanceof Error ? error.message : String(error) });
        sendJson(res, 502, { error: "geo_search_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async apiReverse(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const lat = toNumber(url.searchParams.get("lat"));
        const lng = toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"));
        if (lat === undefined || lng === undefined) {
          sendJson(res, 400, { error: "invalid_coordinates", message: "lat and lon are required numbers" });
          return;
        }
        const startedAt = Date.now();
        const result = await activeGateway.reverseGeocode({ lat, lng, language: url.searchParams.get("language") ?? undefined });
        console.info("[geo.api.reverse]", { lat, lng, hasResult: Boolean(result.displayName), latencyMs: Date.now() - startedAt });
        sendJson(res, 200, { result: normalizePlace(result, 0) });
      } catch (error) {
        console.warn("[geo.api.reverse.error]", { error: error instanceof Error ? error.message : String(error) });
        sendJson(res, 502, { error: "geo_reverse_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async apiAutocomplete(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const query = String(url.searchParams.get("q") ?? "").trim();
        if (!query || query.length < 2) {
          sendJson(res, 400, { error: "invalid_query", message: "q must be at least 2 characters" });
          return;
        }
        const startedAt = Date.now();
        const suggestions = await activeGateway.autocomplete({
          query,
          limit: toNumber(url.searchParams.get("limit")) ?? 8,
          language: url.searchParams.get("language") ?? undefined,
          bounds: parseBounds(Object.fromEntries(url.searchParams.entries())),
          bias: {
            lat: toNumber(url.searchParams.get("lat")),
            lng: toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"))
          }
        });
        console.info("[geo.api.autocomplete]", { query, count: suggestions.length, latencyMs: Date.now() - startedAt });
        sendJson(res, 200, { suggestions });
      } catch (error) {
        console.warn("[geo.api.autocomplete.error]", { error: error instanceof Error ? error.message : String(error) });
        sendJson(res, 502, { error: "geo_autocomplete_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async apiNearby(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!guardPublicEndpoint(req, res)) return;
      try {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
        const lat = toNumber(url.searchParams.get("lat"));
        const lng = toNumber(url.searchParams.get("lon") ?? url.searchParams.get("lng"));
        if (lat === undefined || lng === undefined) {
          sendJson(res, 400, { error: "invalid_coordinates", message: "lat and lon are required numbers" });
          return;
        }

        const radiusMeters = Math.max(200, Math.min(25_000, toNumber(url.searchParams.get("radius")) ?? 3_500));
        const limit = Math.max(1, Math.min(120, toNumber(url.searchParams.get("limit")) ?? 60));
        const categories = (url.searchParams.get("categories") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
        const bounds = toBoundsFromRadius(lat, lng, radiusMeters);

        const canonicalPlaces = searchCanonicalPlacesInBounds(options.listCanonicalPlaces?.() ?? [], {
          bounds,
          categories,
          centerLat: lat,
          centerLng: lng,
          limit
        });

        const fallbackNeeded = canonicalPlaces.length < Math.min(limit, 12);
        const fallbackRows: GeoResult[] = [];

        if (fallbackNeeded) {
          const area = await activeGateway.reverseGeocode({ lat, lng, language: url.searchParams.get("language") ?? undefined });
          const baseQuery = [area.neighborhood, area.city, area.state].filter((item) => Boolean(item && item.trim().length > 0)).join(" ");
          const searchQueries = categories.length === 0
            ? [baseQuery || area.displayName]
            : categories.map((token) => `${token} ${baseQuery || area.displayName}`.trim());
          for (const query of searchQueries) {
            if (!query || fallbackRows.length >= limit) break;
            const results = await activeGateway.geocode({
              query,
              bounds,
              language: url.searchParams.get("language") ?? undefined,
              limit: Math.max(6, Math.ceil(limit / Math.max(1, searchQueries.length)))
            });
            fallbackRows.push(...results);
          }
        }

        const deduped = new Map<string, PerbugGeoPlace>();
        for (const place of canonicalPlaces) {
          deduped.set(`${place.name.toLowerCase()}|${place.latitude.toFixed(5)}|${place.longitude.toFixed(5)}`, normalizeCanonicalPlace(place));
        }
        for (const [index, row] of fallbackRows.entries()) {
          const key = `${row.displayName.toLowerCase()}|${row.lat.toFixed(5)}|${row.lng.toFixed(5)}`;
          if (!deduped.has(key)) deduped.set(key, normalizePlace(row, index));
          if (deduped.size >= limit) break;
        }

        const places = [...deduped.values()].slice(0, limit);
        console.info("[geo.api.nearby]", {
          lat,
          lng,
          radiusMeters,
          categoryCount: categories.length,
          sourceCounts: { canonical: canonicalPlaces.length, fallback: fallbackRows.length },
          resultCount: places.length
        });
        sendJson(res, 200, {
          origin: { lat, lng },
          radiusMeters,
          places,
          sourceBreakdown: {
            canonicalCount: canonicalPlaces.length,
            geoFallbackCount: fallbackRows.length
          }
        });
      } catch (error) {
        console.warn("[geo.api.nearby.error]", { error: error instanceof Error ? error.message : String(error) });
        sendJson(res, 502, { error: "geo_nearby_failed", message: error instanceof Error ? error.message : String(error) });
      }
    },

    async autocomplete(req: IncomingMessage, res: ServerResponse): Promise<void> {
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const suggestions = await activeGateway.autocomplete({
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
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const candidates = await activeGateway.placeLookup({
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
      const activeGateway = getGatewayOrRespond(res);
      if (!activeGateway) return;
      if (!requireAuth(req)) {
        sendJson(res, 401, { error: "geo_service_unauthorized" });
        return;
      }
      try {
        const body = (await parseJsonBody(req)) as Record<string, unknown>;
        const context = await activeGateway.areaContext({
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
      if (!gateway) {
        sendJson(res, 503, { ok: false, mode: status().mode, version: "1.0.0", status: status() });
        return;
      }
      const payload = await gateway.health();
      sendJson(res, payload.ok ? 200 : 503, { ...payload, status: status() });
    },

    async debugStatus(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      sendJson(res, gateway ? 200 : 503, {
        ok: Boolean(gateway),
        gatewayAvailable: Boolean(gateway),
        status: status()
      });
    },

    async ready(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!gateway) {
        sendJson(res, 503, { ok: false, ready: false, mode: status().mode, status: status() });
        return;
      }
      const payload = await gateway.health();
      sendJson(res, payload.ok ? 200 : 503, { ok: payload.ok, ready: payload.ok, mode: payload.mode, status: status() });
    },

    async version(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      sendJson(res, 200, { service: "perbug-geo", version: "1.0.0", status: status() });
    },

    async metrics(_req: IncomingMessage, res: ServerResponse): Promise<void> {
      if (!gateway) {
        sendJson(res, 503, { service: "perbug-geo", metrics: null, upstream: null, status: status() });
        return;
      }
      const payload = await gateway.health();
      sendJson(res, 200, { service: "perbug-geo", metrics: payload.metrics ?? null, upstream: payload.upstream ?? null, status: status() });
    }
  };
}
