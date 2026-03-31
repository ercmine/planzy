import { afterEach, describe, expect, it, vi } from "vitest";

import { GeoServiceClient } from "../client.js";

describe("GeoServiceClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("attaches auth header and parses result", async () => {
    const fetchMock = vi.fn(async (_url: URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)["x-perbug-geo-service"]).toBe("shh");
      return new Response(JSON.stringify({ results: [{ displayName: "x", lat: 1, lng: 2, source: "nominatim" }] }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new GeoServiceClient({
      enabled: true,
      baseUrl: "https://geo.perbug.com",
      timeoutMs: 500,
      retries: 0,
      authSecret: "shh",
      failOpen: true
    });

    const rows = await client.geocode({ query: "Paris" });
    expect(rows).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("calls autocomplete endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ suggestions: [{ id: "1", displayName: "Austin", lat: 1, lng: 2, relevanceScore: 0.9, source: "nominatim" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const client = new GeoServiceClient({
      enabled: true,
      baseUrl: "https://geo.perbug.com",
      timeoutMs: 500,
      retries: 0,
      authSecret: "shh",
      failOpen: true
    });

    const rows = await client.autocomplete({ query: "aus" });
    expect(rows[0]?.displayName).toBe("Austin");
  });

});
