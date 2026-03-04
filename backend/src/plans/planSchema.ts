import { PLAN_CATEGORIES } from "./plan.js";

export function getPlanJsonSchema(): object {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://planzy.dev/schemas/plan.json",
    title: "Plan",
    type: "object",
    additionalProperties: false,
    required: ["id", "source", "sourceId", "title", "category", "location"],
    properties: {
      id: { type: "string", minLength: 1 },
      source: { type: "string", minLength: 1 },
      sourceId: { type: "string", minLength: 1 },
      title: { type: "string", minLength: 1, maxLength: 140 },
      category: { type: "string", enum: [...PLAN_CATEGORIES] },
      description: { type: "string" },
      location: {
        type: "object",
        additionalProperties: false,
        required: ["lat", "lng"],
        properties: {
          lat: { type: "number", minimum: -90, maximum: 90 },
          lng: { type: "number", minimum: -180, maximum: 180 },
          address: { type: "string", maxLength: 200 }
        }
      },
      distanceMeters: { type: "number", minimum: 0, maximum: 500000 },
      priceLevel: { type: "integer", enum: [0, 1, 2, 3, 4] },
      rating: { type: "number", minimum: 0, maximum: 5 },
      reviewCount: { type: "integer", minimum: 0 },
      photos: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["url"],
          properties: {
            url: { type: "string", format: "uri", maxLength: 1000 },
            width: { type: "number" },
            height: { type: "number" }
          }
        }
      },
      hours: {
        type: "object",
        additionalProperties: false,
        properties: {
          openNow: { type: "boolean" },
          weekdayText: {
            type: "array",
            maxItems: 14,
            items: { type: "string", maxLength: 120 }
          }
        }
      },
      deepLinks: {
        type: "object",
        additionalProperties: false,
        properties: {
          maps: { type: "string", format: "uri", maxLength: 1000 },
          website: { type: "string", format: "uri", maxLength: 1000 },
          call: { type: "string", maxLength: 1000, description: "tel: or http(s) URL" },
          booking: { type: "string", format: "uri", maxLength: 1000 },
          ticket: { type: "string", format: "uri", maxLength: 1000 }
        }
      },
      metadata: {
        type: "object",
        maxProperties: 50,
        propertyNames: { type: "string", maxLength: 60 },
        additionalProperties: true
      }
    }
  };
}
