import { describe, expect, it } from "vitest";

import { validatePlan } from "../planValidation.js";
import { mapProviderCategory } from "../normalization/categoryMap.js";
import { normalizeEventsLike } from "../normalization/providers/eventsLike.js";
import { normalizePlacesLike } from "../normalization/providers/placesLike.js";
import { normalizePriceLevel } from "../normalization/price.js";
import { normalizeHttpUrl, normalizeTelUrl } from "../normalization/urls.js";

describe("normalization mappings", () => {
  it("maps provider categories from keywords", () => {
    expect(mapProviderCategory("stub", { categories: ["cafe"] })).toBe("coffee");
    expect(mapProviderCategory("stub", { categories: ["brewery"] })).toBe("drinks");
    expect(mapProviderCategory("stub", { categories: ["trail"] })).toBe("outdoors");
    expect(mapProviderCategory("stub", { categories: ["cinema"] })).toBe("movies");
    expect(mapProviderCategory("stub", { categories: ["yoga"] })).toBe("wellness");
  });

  it("normalizes price levels and clamps numerics", () => {
    expect(normalizePriceLevel("$")).toBe(1);
    expect(normalizePriceLevel("$$$")).toBe(3);
    expect(normalizePriceLevel("PRICE_LEVEL_EXPENSIVE")).toBe(3);
    expect(normalizePriceLevel(7)).toBe(4);
    expect(normalizePriceLevel(null)).toBeUndefined();
    expect(normalizePriceLevel(undefined)).toBeUndefined();
  });

  it("normalizes safe urls and rejects unsafe schemes", () => {
    expect(normalizeHttpUrl("https://example.com/hi")).toBe("https://example.com/hi");
    expect(normalizeHttpUrl("javascript:alert(1)")).toBeUndefined();

    const tel = normalizeTelUrl("(612) 555-1212");
    expect(tel?.startsWith("tel:")).toBe(true);
    expect(tel).toContain("6125551212");
  });

  it("normalizes places-like payload into a valid plan with maps link and mapped category", () => {
    const plan = normalizePlacesLike(
      {
        id: "g-1",
        name: "<b>Hi</b> Cafe",
        types: ["cafe", "point_of_interest"],
        formatted_address: "101 Main St",
        geometry: { location: { lat: 44.98, lng: -93.26 } },
        website: "https://coffee.example.com",
        international_phone_number: "+1 (612) 555-1212"
      },
      "google"
    );

    const validated = validatePlan(plan);
    expect(validated.deepLinks?.mapsLink).toContain("google.com/maps");
    expect(validated.category).toBe("coffee");
    expect(validated.title).toBe("Hi Cafe");
  });

  it("normalizes events-like payload to music with ticket link", () => {
    const plan = normalizeEventsLike(
      {
        id: "evt-1",
        title: "Live Concert",
        venue: { lat: 44.98, lng: -93.26, address: "500 River Rd" },
        ticketUrl: "https://tickets.example.com/event-1",
        url: "https://events.example.com/event-1"
      },
      "ticketmaster"
    );

    const validated = validatePlan(plan);
    expect(validated.category).toBe("music");
    expect(validated.deepLinks?.ticketLink).toBe("https://tickets.example.com/event-1");
  });
});
