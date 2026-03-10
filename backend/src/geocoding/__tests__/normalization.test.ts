import { describe, expect, it } from "vitest";

import { normalizeReverseItem, normalizeSearchItem } from "../normalization.js";

describe("geocoding normalization", () => {
  it("normalizes forward geocode payload", () => {
    const row = normalizeSearchItem({
      display_name: "Soho, Manhattan, New York County, New York, United States",
      lat: "40.7233",
      lon: "-74.0030",
      class: "place",
      type: "suburb",
      importance: 0.71,
      boundingbox: ["40.71", "40.74", "-74.01", "-73.99"],
      address: {
        suburb: "Soho",
        city: "New York",
        state: "New York",
        postcode: "10012",
        country: "United States",
        country_code: "us"
      }
    });

    expect(row).toMatchObject({
      displayName: expect.stringContaining("Soho"),
      lat: 40.7233,
      lng: -74.003,
      city: "New York",
      neighborhood: "Soho",
      state: "New York",
      postalCode: "10012",
      countryCode: "US",
      source: "nominatim"
    });
  });

  it("normalizes reverse geocode and falls back town->city", () => {
    const row = normalizeReverseItem({
      display_name: "Golden Gate Park, San Francisco, California, United States",
      lat: "37.7694",
      lon: "-122.4862",
      address: {
        town: "San Francisco",
        county: "San Francisco County",
        state: "California",
        postcode: "94121",
        country: "United States",
        country_code: "us",
        neighbourhood: "Golden Gate Park"
      }
    });

    expect(row).toMatchObject({
      city: "San Francisco",
      county: "San Francisco County",
      neighborhood: "Golden Gate Park",
      countryCode: "US"
    });
  });
});
