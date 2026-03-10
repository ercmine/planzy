import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GeocodingError } from "../errors.js";
import { GeocodingService } from "../service.js";

describe("GeocodingService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  it("caches forward geocode results", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([
      { display_name: "Minneapolis, Minnesota", lat: "44.9778", lon: "-93.2650", address: { city: "Minneapolis", state: "Minnesota", country: "United States", country_code: "us" } }
    ]), { status: 200 }));

    const service = new GeocodingService({ baseUrl: "http://nominatim.test" });
    const first = await service.geocode({ query: "Minneapolis, MN" });
    const second = await service.geocode({ query: "minneapolis, mn" });

    expect(first[0]?.city).toBe("Minneapolis");
    expect(second[0]?.city).toBe("Minneapolis");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(service.metricsSnapshot().cacheHits).toBe(1);
  });

  it("supports reverse geocode cache keys based on rounded coordinates", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      display_name: "Austin, Texas, United States",
      lat: "30.2672",
      lon: "-97.7431",
      address: { city: "Austin", state: "Texas", country: "United States", country_code: "us" }
    }), { status: 200 }));

    const service = new GeocodingService({ baseUrl: "http://nominatim.test" });
    await service.reverseGeocode({ lat: 30.2672001, lng: -97.7430999 });
    await service.reverseGeocode({ lat: 30.2671999, lng: -97.7431001 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns structured no-results error", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const service = new GeocodingService({ baseUrl: "http://nominatim.test" });

    await expect(service.geocode({ query: "zzzz unknown" })).rejects.toMatchObject<Partial<GeocodingError>>({
      code: "no_results",
      statusCode: 404
    });
  });

  it("handles provider timeout", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("aborted"), { name: "AbortError" }));
    const service = new GeocodingService({ baseUrl: "http://nominatim.test" });

    await expect(service.geocode({ query: "Austin" })).rejects.toMatchObject<Partial<GeocodingError>>({
      code: "timeout",
      statusCode: 504
    });
  });

  it("rejects invalid input", async () => {
    const service = new GeocodingService({ baseUrl: "http://nominatim.test" });
    await expect(service.reverseGeocode({ lat: 99, lng: 10 })).rejects.toMatchObject<Partial<GeocodingError>>({ code: "invalid_input", statusCode: 400 });
  });

  it("does not enable public fallback in prod", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream", { status: 503 }));

    const service = new GeocodingService({
      baseUrl: "http://private-nominatim",
      fallbackBaseUrl: "https://nominatim.openstreetmap.org",
      enableFallback: true,
      env: "prod"
    });

    await expect(service.geocode({ query: "Paris" })).rejects.toMatchObject<Partial<GeocodingError>>({
      code: "provider_unavailable"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
