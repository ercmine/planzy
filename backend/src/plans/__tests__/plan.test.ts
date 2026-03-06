import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors.js";
import { toPublicPlan, type Plan } from "../plan.js";
import { validatePlan, validatePlanArray } from "../planValidation.js";

describe("plan validation", () => {
  it("validatePlan accepts a minimal valid Plan", () => {
    const plan = validatePlan({
      id: "stub:1",
      source: "stub",
      sourceId: "1",
      title: "Sunrise Cafe",
      category: "coffee",
      location: { lat: 37.775, lng: -122.418 }
    });

    expect(plan.id).toBe("stub:1");
    expect(plan.category).toBe("coffee");
  });

  it("rejects invalid url in photos/deepLinks", () => {
    expect(() =>
      validatePlan({
        id: "stub:1",
        source: "stub",
        sourceId: "1",
        title: "Bad Link",
        category: "food",
        location: { lat: 37.775, lng: -122.418 },
        photos: [{ url: "ftp://bad.example.com" }]
      })
    ).toThrowError(ValidationError);

    expect(() =>
      validatePlan({
        id: "stub:1",
        source: "stub",
        sourceId: "1",
        title: "Bad Link",
        category: "food",
        location: { lat: 37.775, lng: -122.418 },
        deepLinks: { websiteLink: "javascript:alert(1)" }
      })
    ).toThrowError(ValidationError);
  });

  it("rejects invalid category", () => {
    expect(() =>
      validatePlan({
        id: "stub:1",
        source: "stub",
        sourceId: "1",
        title: "Unknown Category",
        category: "museum",
        location: { lat: 37.775, lng: -122.418 }
      })
    ).toThrowError(ValidationError);
  });

  it("strips metadata private keys via toPublicPlan", () => {
    const plan: Plan = {
      id: "stub:1",
      source: "stub",
      sourceId: "1",
      title: "Private metadata",
      category: "other",
      location: { lat: 37.775, lng: -122.418 },
      metadata: {
        visible: true,
        _private: "hidden",
        nested: {
          safe: "ok",
          _internal: "remove"
        }
      }
    };

    const publicPlan = toPublicPlan(plan);
    expect(publicPlan.metadata).toEqual({ visible: true, nested: { safe: "ok" } });
  });

  it("validatePlanArray rejects non-array", () => {
    expect(() => validatePlanArray({ nope: true })).toThrowError(ValidationError);
  });
});
