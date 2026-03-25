import { describe, expect, it, vi } from "vitest";

import { createGeoHttpHandlers } from "../http.js";

describe("createGeoHttpHandlers", () => {
  it("rejects unauthorized v1 request when internal auth is enabled", async () => {
    const protectedHandlers = createGeoHttpHandlers({
      geocode: vi.fn(),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local" as const, version: "1" }))
    }, { authSecret: "geo-secret" });

    const res = createMockResponse();
    await protectedHandlers.geocode({ method: "POST", headers: {}, url: "/v1/geocode" } as never, res as never);
    expect(res.statusCode).toBe(401);
  });

  it("serves public /api/geo/search responses", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(async () => [{ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, source: "nominatim" as const }]),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local" as const, version: "1" }))
    });

    const res = createMockResponse();
    await handlers.apiSearch({ method: "GET", headers: {}, url: "/api/geo/search?q=austin" } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(String(res.body)).toContain("Austin, Texas");
  });

  it("validates short /api/geo/search queries", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local" as const, version: "1" }))
    });

    const res = createMockResponse();
    await handlers.apiSearch({ method: "GET", headers: {}, url: "/api/geo/search?q=a" } as never, res as never);
    expect(res.statusCode).toBe(400);
  });

  it("rate limits public geo endpoints", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(async () => [{ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, source: "nominatim" as const }]),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local" as const, version: "1" }))
    }, { rateLimitPerMinute: 30 });

    const denied = createMockResponse();
    await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "1.1.1.1" }, url: "/api/geo/search?q=austin" } as never, denied as never);
    expect(denied.statusCode).toBe(200);

    for (let i = 0; i < 30; i += 1) {
      const res = createMockResponse();
      await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "2.2.2.2" }, url: "/api/geo/search?q=austin" } as never, res as never);
    }

    const blocked = createMockResponse();
    await handlers.apiSearch({ method: "GET", headers: { "x-forwarded-for": "2.2.2.2" }, url: "/api/geo/search?q=austin" } as never, blocked as never);
    expect(blocked.statusCode).toBe(429);
  });

  it("serves /api/geo/nearby responses", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(async () => [{ displayName: "Coffee Austin", lat: 30.2672, lng: -97.7431, source: "nominatim" as const }]),
      reverseGeocode: vi.fn(async () => ({ displayName: "Austin, Texas", lat: 30.2672, lng: -97.7431, city: "Austin", state: "Texas", source: "nominatim" as const })),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local" as const, version: "1" }))
    });

    const res = createMockResponse();
    await handlers.apiNearby({ method: "GET", headers: {}, url: "/api/geo/nearby?lat=30.2672&lng=-97.7431&radius=1500" } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(String(res.body)).toContain("Coffee Austin");
  });
});

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) { this.headers[name] = value; },
    end(chunk?: string) { this.body += chunk ?? ""; }
  };
}
