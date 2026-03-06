import { describe, expect, it } from "vitest";

import { PlacesProvider } from "../providers/places/placesProvider.js";
import type { SearchPlansInput } from "../types.js";

const baseInput: SearchPlansInput = {
  location: { lat: 37.775, lng: -122.418 },
  radiusMeters: 3_000,
  limit: 20,
  categories: ["food"]
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function makeSuccessFetch(counter?: { google: number; yelp: number }): typeof fetch {
  return (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();

    if (url.includes("places.googleapis.com")) {
      if (counter) {
        counter.google += 1;
      }
      return jsonResponse({
        places: [
          {
            id: "g1",
            displayName: { text: "Central Pizza" },
            formattedAddress: "1 Main St",
            location: { latitude: 37.775, longitude: -122.418 },
            rating: 4.6,
            userRatingCount: 250,
            priceLevel: "PRICE_LEVEL_MODERATE",
            websiteUri: "https://centralpizza.example.com",
            googleMapsUri: "https://maps.google.com/?q=central+pizza",
            internationalPhoneNumber: "+1 555-0001",
            regularOpeningHours: { openNow: true, weekdayDescriptions: ["Mon: 9-5"] },
            types: ["restaurant"]
          },
          {
            id: "g2",
            displayName: { text: "Night Burgers" },
            formattedAddress: "2 Main St",
            location: { latitude: 37.776, longitude: -122.417 },
            rating: 4.1,
            userRatingCount: 120,
            priceLevel: 2,
            types: ["restaurant"]
          }
        ]
      });
    }

    if (url.includes("api.yelp.com")) {
      if (counter) {
        counter.yelp += 1;
      }
      return jsonResponse({
        businesses: [
          {
            id: "y1",
            name: "Central Pizza",
            url: "https://www.yelp.com/biz/central-pizza",
            image_url: "https://images.example.com/pizza.jpg",
            rating: 4.8,
            review_count: 500,
            price: "$$",
            display_phone: "+1 555-0001",
            coordinates: { latitude: 37.77501, longitude: -122.41801 },
            location: { display_address: ["1 Main St", "San Francisco, CA"] },
            categories: [{ alias: "restaurants", title: "Restaurants" }],
            distance: 5
          },
          {
            id: "y2",
            name: "Soup House",
            url: "https://www.yelp.com/biz/soup-house",
            rating: 4.4,
            review_count: 150,
            price: "$",
            coordinates: { latitude: 37.779, longitude: -122.41 },
            location: { display_address: ["99 Market St", "San Francisco, CA"] },
            categories: [{ alias: "restaurants", title: "Restaurants" }],
            distance: 800
          }
        ],
        total: 2
      });
    }

    return jsonResponse({}, 404);
  }) as typeof fetch;
}

describe("PlacesProvider", () => {
  it("merges google + yelp, dedupes, and ranks deterministically", async () => {
    const provider = new PlacesProvider({ googleApiKey: "g-key", yelpApiKey: "y-key" }, { fetchFn: makeSuccessFetch() });
    const result = await provider.searchPlans(baseInput, { timeoutMs: 2_000 });

    expect(result.source).toBe("places");
    expect(result.plans.map((plan) => plan.sourceId)).toEqual(["g2", "y1", "y2"]);
    expect(result.plans).toHaveLength(3);
  });

  it("returns google results when yelp is rate-limited", async () => {
    const fetchFn = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("places.googleapis.com")) {
        return jsonResponse({
          places: [
            {
              id: "g1",
              displayName: { text: "Only Google" },
              location: { latitude: 37.775, longitude: -122.418 },
              types: ["restaurant"]
            }
          ]
        });
      }
      return jsonResponse({}, 429);
    }) as typeof fetch;

    const provider = new PlacesProvider({ googleApiKey: "g-key", yelpApiKey: "y-key" }, { fetchFn });
    const result = await provider.searchPlans(baseInput, { timeoutMs: 2_000 });

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.source).toBe("google");
  });

  it("returns yelp results when google times out", async () => {
    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("places.googleapis.com")) {
        await new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        });
      }

      return jsonResponse({
        businesses: [
          {
            id: "y1",
            name: "Only Yelp",
            coordinates: { latitude: 37.775, longitude: -122.418 },
            categories: [{ alias: "restaurants" }],
            location: { display_address: ["x"] }
          }
        ]
      });
    }) as typeof fetch;

    const provider = new PlacesProvider(
      { googleApiKey: "g-key", yelpApiKey: "y-key", google: { timeoutMs: 10 } },
      { fetchFn }
    );

    const result = await provider.searchPlans(baseInput, { timeoutMs: 2_000 });
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.source).toBe("yelp");
  });

  it("throws ALL_SOURCES_FAILED when both fail", async () => {
    const fetchFn = (async () => jsonResponse({}, 500)) as typeof fetch;
    const provider = new PlacesProvider({ googleApiKey: "g-key", yelpApiKey: "y-key" }, { fetchFn });

    await expect(provider.searchPlans(baseInput)).rejects.toMatchObject({
      provider: "places",
      code: "ALL_SOURCES_FAILED"
    });
  });

  it("applies openNow for yelp output and passes openNow to google", async () => {
    let googleRequestBody: string | undefined;
    const fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("places.googleapis.com")) {
        googleRequestBody = String(init?.body ?? "");
        return jsonResponse({
          places: [
            {
              id: "g-open",
              displayName: { text: "Google Open" },
              location: { latitude: 37.775, longitude: -122.418 },
              regularOpeningHours: { openNow: true },
              types: ["restaurant"]
            }
          ]
        });
      }

      return jsonResponse({
        businesses: [
          {
            id: "y-open",
            name: "Yelp Open",
            coordinates: { latitude: 37.7752, longitude: -122.4178 },
            categories: [{ alias: "restaurants" }],
            location: { display_address: ["x"] }
          }
        ]
      });
    }) as typeof fetch;

    const provider = new PlacesProvider({ googleApiKey: "g-key", yelpApiKey: "y-key" }, { fetchFn });
    const result = await provider.searchPlans({ ...baseInput, openNow: true });

    const yelp = result.plans.find((plan) => plan.source === "yelp");
    expect(yelp?.hours?.openNow).toBe(true);
    expect(googleRequestBody).toContain('"openNow":true');
  });

  it("maps priceLevelMax to yelp price query", async () => {
    let yelpUrl = "";
    const fetchFn = (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("api.yelp.com")) {
        yelpUrl = url;
        return jsonResponse({ businesses: [] });
      }
      return jsonResponse({ places: [] });
    }) as typeof fetch;

    const provider = new PlacesProvider({ googleApiKey: "g-key", yelpApiKey: "y-key" }, { fetchFn });
    await provider.searchPlans({ ...baseInput, priceLevelMax: 3 });

    expect(yelpUrl).toContain("price=1%2C2%2C3");
  });

  it("uses cache for repeated query within TTL", async () => {
    const counter = { google: 0, yelp: 0 };
    const nowValues = [1000, 1000, 1001, 1001];
    let idx = 0;
    const provider = new PlacesProvider(
      { googleApiKey: "g-key", yelpApiKey: "y-key", cacheTtlMs: 60_000 },
      { fetchFn: makeSuccessFetch(counter), now: () => nowValues[Math.min(idx++, nowValues.length - 1)] }
    );

    await provider.searchPlans(baseInput);
    await provider.searchPlans(baseInput);

    expect(counter.google).toBe(1);
    expect(counter.yelp).toBe(1);
  });
});
