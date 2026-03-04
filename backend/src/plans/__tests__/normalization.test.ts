import { describe, expect, it } from "vitest";

import { mapProviderCategory } from "../normalization/categoryMap.js";
import { normalizeEventsLike } from "../normalization/providers/eventsLike.js";
import { normalizePlacesLike } from "../normalization/providers/placesLike.js";
import { normalizePriceLevel } from "../normalization/price.js";
import { normalizeHttpUrl } from "../normalization/urls.js";

describe("normalization helpers", () => {
  it("maps provider categories", () => {
    expect(mapProviderCategory("stub", { categories: ["cafe"] })).toBe("coffee");
    expect(mapProviderCategory("stub", { categories: ["brewery"] })).toBe("drinks");
    expect(mapProviderCategory("stub", { categories: ["trail"] })).toBe("outdoors");
    expect(mapProviderCategory("stub", { categories: ["cinema"] })).toBe("movies");
  });

  it("normalizes price levels", () => {
    expect(normalizePriceLevel("$$$")).toBe(3);
    expect(normalizePriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe(3);
  });

  it("normalizes http urls", () => {
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(normalizeHttpUrl("https://example.com/test")).toBe("https://example.com/test");
  });

  it("normalizes places-like payload into canonical plan", () => {
    const plan = normalizePlacesLike(
      {
        id: "abc123",
        name: "Hilltop Brewery",
        types: ["brewery", "point_of_interest"],
        formatted_address: "123 Main St",
        geometry: { location: { lat: 37.77, lng: -122.42 } },
        price_level: "$$",
        opening_hours: { open_now: true, weekday_text: ["Mon: 8am-8pm"] },
        international_phone_number: "+1 (555) 333-4444",
        website: "https://brewery.example.com",
        metadata: {
          _private: "hidden",
          safe: "ok"
        }
      },
      "places"
    );

    expect(plan.id).toBe("places:abc123");
    expect(plan.deepLinks?.maps).toContain("google.com/maps");
    expect(plan.deepLinks?.call).toBe("tel:+15553334444");
    expect(plan.metadata).toEqual({ safe: "ok" });
  });

  it("normalizes events-like payload and infers music category", () => {
    const plan = normalizeEventsLike(
      {
        id: "evt-1",
        title: "Live Concert at The Pier",
        description: "An outdoor live music show",
        venue: {
          name: "Pier Stage",
          address: "500 Bay St",
          lat: 37.8,
          lng: -122.4
        },
        ticketUrl: "https://tickets.example.com/e/1",
        url: "https://events.example.com/e/1",
        imageUrls: ["https://img.example.com/1.jpg"],
        metadata: { _secret: true, promo: "SPRING" }
      },
      "events"
    );

    expect(plan.category).toBe("music");
    expect(plan.deepLinks?.ticket).toBe("https://tickets.example.com/e/1");
    expect(plan.metadata).toMatchObject({ promo: "SPRING" });
    expect(plan.metadata?._secret).toBeUndefined();
  });
});
