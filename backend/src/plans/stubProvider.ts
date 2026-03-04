import { ValidationError } from "./errors.js";
import type { PlanProvider, ProviderContext } from "./provider.js";
import { makePlanId } from "./provider.js";
import type { Category, NormalizedPlan, SearchPlansInput, SearchPlansResult } from "./types.js";
import { validateSearchPlansInput } from "./validation.js";

interface StubRecord {
  sourceId: string;
  title: string;
  category: Category;
  location: { lat: number; lng: number; address?: string };
  priceLevel?: 0 | 1 | 2 | 3 | 4;
  hours?: { openNow?: boolean; weekdayText?: string[] };
  description?: string;
}

const STUB_DATA: StubRecord[] = [
  { sourceId: "1", title: "Sunrise Cafe", category: "coffee", location: { lat: 37.775, lng: -122.418, address: "101 Market St" }, priceLevel: 1, hours: { openNow: true } },
  { sourceId: "2", title: "Golden Slice", category: "food", location: { lat: 37.776, lng: -122.419, address: "22 Mission St" }, priceLevel: 2, hours: { openNow: true } },
  { sourceId: "3", title: "Moonlight Bar", category: "drinks", location: { lat: 37.778, lng: -122.421, address: "8 Howard St" }, priceLevel: 3, hours: { openNow: false } },
  { sourceId: "4", title: "Park Trail Loop", category: "outdoors", location: { lat: 37.769, lng: -122.486, address: "Golden Gate Park" }, priceLevel: 0, hours: { openNow: true } },
  { sourceId: "5", title: "Indie Cinema", category: "movies", location: { lat: 37.764, lng: -122.463, address: "450 Funston Ave" }, priceLevel: 2, hours: { openNow: false } },
  { sourceId: "6", title: "Jazz Corner", category: "music", location: { lat: 37.782, lng: -122.410, address: "44 2nd St" }, priceLevel: 2, hours: { openNow: true } },
  { sourceId: "7", title: "Urban Outfit Plaza", category: "shopping", location: { lat: 37.784, lng: -122.407, address: "200 Powell St" }, priceLevel: 3, hours: { openNow: true } },
  { sourceId: "8", title: "Calm Wellness", category: "wellness", location: { lat: 37.770, lng: -122.430, address: "98 Hayes St" }, priceLevel: 2, hours: { openNow: false } },
  { sourceId: "9", title: "City Sports Hub", category: "sports", location: { lat: 37.768, lng: -122.392, address: "1 King St" }, priceLevel: 1, hours: { openNow: true } },
  { sourceId: "10", title: "Neighborhood Surprise", category: "other", location: { lat: 37.760, lng: -122.447, address: "77 Castro St" }, priceLevel: 0, hours: { openNow: true } },
  { sourceId: "11", title: "Pier Coffee Roasters", category: "coffee", location: { lat: 37.808, lng: -122.409, address: "39 Pier" }, priceLevel: 2, hours: { openNow: true } },
  { sourceId: "12", title: "Bistro Vista", category: "food", location: { lat: 37.800, lng: -122.437, address: "300 Lombard St" }, priceLevel: 4, hours: { openNow: false } }
];

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null): number {
  if (!cursor) {
    return 0;
  }
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  const parsed = Number.parseInt(decoded, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ValidationError(["cursor is invalid"]);
  }
  return parsed;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const earthRadius = 6_371_000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa = sinLat * sinLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadius * c;
}

export class StubProvider implements PlanProvider {
  public readonly name = "stub";

  public async searchPlans(input: SearchPlansInput, ctx?: ProviderContext): Promise<SearchPlansResult> {
    const started = Date.now();
    if (ctx?.signal?.aborted) {
      throw new Error("AbortError");
    }

    const normalized = validateSearchPlansInput(input);
    const offset = decodeCursor(normalized.cursor);

    const filtered = STUB_DATA.map((record) => {
      const distanceMeters = haversineMeters(
        normalized.location.lat,
        normalized.location.lng,
        record.location.lat,
        record.location.lng
      );
      return { record, distanceMeters };
    })
      .filter((entry) => entry.distanceMeters <= normalized.radiusMeters)
      .filter((entry) => {
        if (!normalized.categories || normalized.categories.length === 0) {
          return true;
        }
        return normalized.categories.includes(entry.record.category);
      })
      .filter((entry) => {
        if (normalized.priceLevelMax === undefined) {
          return true;
        }
        const price = entry.record.priceLevel ?? 0;
        return price <= normalized.priceLevelMax;
      })
      .filter((entry) => {
        if (normalized.openNow === undefined) {
          return true;
        }
        return entry.record.hours?.openNow === normalized.openNow;
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    const paged = filtered.slice(offset, offset + normalized.limit);
    const nextOffset = offset + paged.length;
    const nextCursor = nextOffset < filtered.length ? encodeCursor(nextOffset) : null;

    const plans: NormalizedPlan[] = paged.map(({ record, distanceMeters }) => ({
      id: makePlanId(this.name, record.sourceId),
      source: this.name,
      sourceId: record.sourceId,
      title: record.title,
      category: record.category,
      description: record.description,
      location: record.location,
      distanceMeters: Math.round(distanceMeters),
      priceLevel: record.priceLevel,
      hours: record.hours
    }));

    return {
      plans,
      nextCursor,
      source: this.name,
      debug: {
        tookMs: Date.now() - started,
        returned: plans.length
      }
    };
  }
}
