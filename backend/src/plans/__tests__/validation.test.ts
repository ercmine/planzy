import { describe, expect, it } from "vitest";

import { ValidationError } from "../errors.js";
import { validateSearchPlansInput } from "../validation.js";

describe("validateSearchPlansInput", () => {
  it("applies defaults", () => {
    const result = validateSearchPlansInput({
      location: { lat: 37.77, lng: -122.41 },
      radiusMeters: 1200
    });

    expect(result.limit).toBe(50);
    expect(result.cursor).toBeNull();
  });

  it("throws ValidationError for invalid lat/lng with details", () => {
    expect(() =>
      validateSearchPlansInput({
        location: { lat: 100, lng: -200 },
        radiusMeters: 500
      })
    ).toThrowError(ValidationError);

    try {
      validateSearchPlansInput({
        location: { lat: 100, lng: -200 },
        radiusMeters: 500
      });
    } catch (error) {
      const validationError = error as ValidationError;
      expect(validationError.details.join(" ")).toContain("location.lat");
      expect(validationError.details.join(" ")).toContain("location.lng");
    }
  });

  it("clamps limit to max cap", () => {
    const result = validateSearchPlansInput({
      location: { lat: 37.77, lng: -122.41 },
      radiusMeters: 1200,
      limit: 999
    });

    expect(result.limit).toBe(100);
  });


  it("supports batchSize alias", () => {
    const result = validateSearchPlansInput({
      location: { lat: 37.77, lng: -122.41 },
      radiusMeters: 1200,
      batchSize: 35
    } as never);

    expect(result.limit).toBe(35);
  });

  it("rejects invalid timeWindow values", () => {
    expect(() =>
      validateSearchPlansInput({
        location: { lat: 37.77, lng: -122.41 },
        radiusMeters: 1200,
        timeWindow: { start: "not-date", end: "2026-01-01T00:00:00.000Z" }
      })
    ).toThrowError(ValidationError);

    expect(() =>
      validateSearchPlansInput({
        location: { lat: 37.77, lng: -122.41 },
        radiusMeters: 1200,
        timeWindow: {
          start: "2026-01-10T00:00:00.000Z",
          end: "2026-01-01T00:00:00.000Z"
        }
      })
    ).toThrowError(ValidationError);

    expect(() =>
      validateSearchPlansInput({
        location: { lat: 37.77, lng: -122.41 },
        radiusMeters: 1200,
        timeWindow: {
          start: "2026-01-01T00:00:00.000Z",
          end: "2026-01-20T00:00:00.000Z"
        }
      })
    ).toThrowError(ValidationError);
  });
});
