import { describe, expect, it } from "vitest";

import { RateLimitError } from "../errors.js";
import { EventsProvider } from "../providers/events/eventsProvider.js";
import type { SearchPlansInput } from "../types.js";

const baseInput: SearchPlansInput = {
  location: { lat: 37.775, lng: -122.418 },
  radiusMeters: 5_000,
  limit: 10
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function makeEvents(ids: string[]): unknown[] {
  return ids.map((id, idx) => ({
    id,
    name: `Event ${id}`,
    url: `https://ticketmaster.example.com/${id}`,
    images: [{ url: `https://images.example.com/${id}.jpg`, width: 800, height: 450, ratio: "16_9" }],
    dates: { start: { dateTime: `2026-01-0${idx + 1}T18:00:00Z` } },
    classifications: [{ segment: { name: "Music" }, genre: { name: "Rock" } }],
    _embedded: {
      venues: [
        {
          name: "Great Venue",
          location: { latitude: "37.77", longitude: "-122.41" },
          address: { line1: "1 Market St" },
          city: { name: "San Francisco" },
          state: { stateCode: "CA" },
          postalCode: "94103"
        }
      ]
    }
  }));
}

describe("EventsProvider", () => {
  it("returns normalized plans with startTimeISO metadata and ticket deep link", async () => {
    const fetchFn = (async () =>
      jsonResponse({
        _embedded: { events: makeEvents(["e1"]) }
      })) as typeof fetch;

    const provider = new EventsProvider({ ticketmasterApiKey: "tm-key" }, { fetchFn });
    const result = await provider.searchPlans(baseInput);

    expect(result.source).toBe("events");
    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]?.metadata?.startTimeISO).toBe("2026-01-01T18:00:00Z");
    expect(result.plans[0]?.deepLinks?.ticket).toBe("https://ticketmaster.example.com/e1");
  });

  it("translates timeWindow to startDateTime/endDateTime query params", async () => {
    let requestedUrl = "";
    const fetchFn = (async (input: RequestInfo | URL) => {
      requestedUrl = typeof input === "string" ? input : input.toString();
      return jsonResponse({ _embedded: { events: [] } });
    }) as typeof fetch;

    const provider = new EventsProvider({ ticketmasterApiKey: "tm-key" }, { fetchFn });
    await provider.searchPlans({
      ...baseInput,
      timeWindow: {
        start: "2026-02-03T10:00:00-08:00",
        end: "2026-02-04T10:00:00-08:00"
      }
    });

    const url = new URL(requestedUrl);
    expect(url.searchParams.get("startDateTime")).toBe("2026-02-03T18:00:00.000Z");
    expect(url.searchParams.get("endDateTime")).toBe("2026-02-04T18:00:00.000Z");
  });

  it("maps Music classification into music category", async () => {
    const fetchFn = (async () =>
      jsonResponse({
        _embedded: { events: makeEvents(["e1"]) }
      })) as typeof fetch;

    const provider = new EventsProvider({ ticketmasterApiKey: "tm-key" }, { fetchFn });
    const result = await provider.searchPlans({ ...baseInput, categories: ["music"] });

    expect(result.plans[0]?.category).toBe("music");
  });

  it("uses cache for repeated query within ttl", async () => {
    let requests = 0;
    const fetchFn = (async () => {
      requests += 1;
      return jsonResponse({ _embedded: { events: makeEvents(["e1"]) } });
    }) as typeof fetch;

    const nowValues = [1000, 1000, 1001, 1001];
    let idx = 0;
    const provider = new EventsProvider(
      { ticketmasterApiKey: "tm-key", cacheTtlMs: 60_000 },
      {
        fetchFn,
        now: () => nowValues[Math.min(idx++, nowValues.length - 1)]
      }
    );

    await provider.searchPlans(baseInput);
    await provider.searchPlans(baseInput);

    expect(requests).toBe(1);
  });

  it("throws RateLimitError on 429", async () => {
    const fetchFn = (async () => jsonResponse({}, 429)) as typeof fetch;
    const provider = new EventsProvider({ ticketmasterApiKey: "tm-key" }, { fetchFn });

    await expect(provider.searchPlans(baseInput)).rejects.toBeInstanceOf(RateLimitError);
    await expect(provider.searchPlans(baseInput)).rejects.toMatchObject({
      provider: "ticketmaster",
      code: "RATE_LIMIT",
      retryable: true
    });
  });

  it("supports base64 offset cursor pagination", async () => {
    const fetchFn = (async () =>
      jsonResponse({
        _embedded: { events: makeEvents(["e1", "e2", "e3"]) }
      })) as typeof fetch;

    const provider = new EventsProvider({ ticketmasterApiKey: "tm-key" }, { fetchFn });
    const page1 = await provider.searchPlans({ ...baseInput, limit: 2 });
    const page2 = await provider.searchPlans({ ...baseInput, limit: 2, cursor: page1.nextCursor ?? null });

    expect(page1.plans).toHaveLength(2);
    expect(page1.nextCursor).toBeTruthy();
    expect(page2.plans).toHaveLength(1);
    expect(page2.plans[0]?.sourceId).toBe("e3");
  });
});
