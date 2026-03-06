import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors.js";
import { normalizeDeepLinks } from "../deeplinks/deepLinkNormalize.js";
import { validatePlanDeepLinks } from "../deeplinks/deepLinkValidation.js";
import { validatePlan } from "../planValidation.js";

describe("deep link validation", () => {
  it("validatePlanDeepLinks accepts v2 keys with https and tel", () => {
    const result = validatePlanDeepLinks({
      mapsLink: "https://maps.example.com/a",
      websiteLink: "https://example.com",
      callLink: "tel:+16125551212",
      bookingLink: "https://booking.example.com",
      ticketLink: "https://tickets.example.com"
    });

    expect(result).toEqual({
      mapsLink: "https://maps.example.com/a",
      websiteLink: "https://example.com",
      callLink: "tel:+16125551212",
      bookingLink: "https://booking.example.com",
      ticketLink: "https://tickets.example.com"
    });
  });

  it("validatePlanDeepLinks accepts legacy keys and returns v2 object", () => {
    const result = validatePlanDeepLinks({
      maps: "https://maps.example.com/legacy",
      website: "https://legacy.example.com",
      call: "tel:16125551212"
    });

    expect(result).toEqual({
      mapsLink: "https://maps.example.com/legacy",
      websiteLink: "https://legacy.example.com",
      callLink: "tel:16125551212",
      bookingLink: undefined,
      ticketLink: undefined
    });
  });

  it("rejects invalid javascript urls", () => {
    expect(() => validatePlanDeepLinks({ websiteLink: "javascript:alert(1)" })).toThrowError(ValidationError);
  });

  it("normalizeDeepLinks drops invalid values without throwing", () => {
    const result = normalizeDeepLinks({
      websiteLink: "javascript:alert(1)",
      callLink: "tel:abc",
      ticket: "https://tickets.example.com/ok"
    });

    expect(result).toEqual({
      mapsLink: undefined,
      websiteLink: undefined,
      callLink: undefined,
      bookingLink: undefined,
      ticketLink: "https://tickets.example.com/ok"
    });
  });

  it("validatePlan accepts legacy deepLinks and returns v2 deepLinks", () => {
    const result = validatePlan({
      id: "stub:1",
      source: "stub",
      sourceId: "1",
      title: "Legacy Plan",
      category: "food",
      location: { lat: 37.77, lng: -122.42 },
      deepLinks: {
        website: "https://legacy.example.com",
        maps: "https://maps.example.com"
      }
    });

    expect(result.deepLinks).toEqual({
      mapsLink: "https://maps.example.com",
      websiteLink: "https://legacy.example.com",
      callLink: undefined,
      bookingLink: undefined,
      ticketLink: undefined
    });
  });

  it("validates callLink tel formats", () => {
    expect(validatePlanDeepLinks({ callLink: "tel:+16125551212" })?.callLink).toBe("tel:+16125551212");
    expect(() => validatePlanDeepLinks({ callLink: "tel:abc" })).toThrowError(ValidationError);
  });
});
