import type { Plan } from "../../plan.js";
import { normalizeBasePlan } from "../normalize.js";
import { normalizePriceLevel, priceHintToLevel } from "../price.js";

export interface EventsLikeRaw {
  id: string;
  title: string;
  description?: string;
  venue?: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  startTimeISO?: string;
  priceHint?: string;
  url?: string;
  ticketUrl?: string;
  imageUrls?: string[];
  metadata?: Record<string, unknown>;
}

const EVENT_CATEGORY_HINTS = [
  "concert",
  "live music",
  "movie",
  "cinema",
  "trail",
  "hiking",
  "restaurant",
  "coffee",
  "brewery",
  "sports"
];

function inferEventCategories(raw: EventsLikeRaw): string[] {
  const blob = `${raw.title} ${raw.description ?? ""}`.toLowerCase();
  return EVENT_CATEGORY_HINTS.filter((hint) => blob.includes(hint));
}

export function normalizeEventsLike(raw: EventsLikeRaw, provider: string): Plan {
  const inferredCategories = inferEventCategories(raw);
  const price = priceHintToLevel(raw.priceHint) ?? normalizePriceLevel(raw.priceHint);

  return normalizeBasePlan(
    {
      title: raw.title,
      description: raw.description,
      categoryInput: {
        categories: inferredCategories,
        primary: inferredCategories[0] ?? null
      },
      location: {
        lat: raw.venue?.lat,
        lng: raw.venue?.lng,
        address: raw.venue?.address
      },
      price,
      photos: raw.imageUrls,
      website: raw.url,
      ticket: raw.ticketUrl,
      metadata: {
        startTimeISO: raw.startTimeISO,
        venueName: raw.venue?.name,
        ...(raw.metadata ?? {})
      }
    },
    {
      provider,
      sourceId: raw.id
    }
  );
}
