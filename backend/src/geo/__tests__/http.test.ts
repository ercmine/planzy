import { describe, expect, it, vi } from "vitest";

import { createGeoHttpHandlers } from "../http.js";

describe("createGeoHttpHandlers", () => {
  it("rejects unauthorized v1 request", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
    });

    const res = createMockResponse();
    await handlers.geocode({ method: "POST", headers: {}, url: "/v1/geocode" } as never, res as never);
    expect(res.statusCode).toBe(502);

    const protectedHandlers = createGeoHttpHandlers({
      geocode: vi.fn(),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
    }, { authSecret: "geo-secret" });

    const res2 = createMockResponse();
    await protectedHandlers.geocode({ method: "POST", headers: {}, url: "/v1/geocode" } as never, res2 as never);
    expect(res2.statusCode).toBe(401);
  });

  it("serves autocomplete", async () => {
    const handlers = createGeoHttpHandlers({
      geocode: vi.fn(),
      reverseGeocode: vi.fn(),
      autocomplete: vi.fn(async () => [{ id: "a", displayName: "Austin", lat: 1, lng: 2, relevanceScore: 0.8, source: "nominatim" }]),
      placeLookup: vi.fn(),
      areaContext: vi.fn(),
      health: vi.fn(async () => ({ ok: true, mode: "local", version: "1" }))
    }, { authSecret: "geo-secret" });

    const res = createMockResponse();
    await handlers.autocomplete({
      method: "POST",
      headers: { "x-perbug-geo-service": "geo-secret" },
      url: "/v1/autocomplete",
      [Symbol.asyncIterator]: async function* () { yield Buffer.from('{"query":"aus"}'); }
    } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(String(res.body)).toContain("Austin");
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
