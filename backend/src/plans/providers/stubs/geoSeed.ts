import type { SearchPlansInputNormalized } from "../../validation.js";
import type { Rng } from "./prng.js";
import { pick, randInt } from "./prng.js";

const STREET_NAMES = [
  "Oak",
  "Maple",
  "Pine",
  "Cedar",
  "Lake",
  "Sunset",
  "Broad",
  "Market",
  "River",
  "Hill",
  "Lincoln",
  "Main"
];

const STREET_SUFFIXES = ["St", "Ave", "Blvd", "Rd", "Ln", "Way", "Pl", "Dr"];
const CITIES = ["Springfield", "Riverton", "Brookdale", "Northfield", "Westhaven"];
const STATES = ["CA", "NY", "TX", "WA", "IL"];

export function seedFromSearch(input: SearchPlansInputNormalized, provider: string): string {
  const latCell = input.location.lat.toFixed(3);
  const lngCell = input.location.lng.toFixed(3);
  const radiusBucket = Math.round(input.radiusMeters / 500) * 500;
  const categories = input.categories && input.categories.length > 0 ? [...input.categories].sort().join(",") : "any";
  const openNow = input.openNow === undefined ? "any" : String(input.openNow);
  const priceLevelMax = input.priceLevelMax === undefined ? "any" : String(input.priceLevelMax);
  const timeBucket = input.timeWindow?.start ? input.timeWindow.start.slice(0, 10) : "none";

  return [provider, latCell, lngCell, `r${radiusBucket}`, `cat:${categories}`, `open:${openNow}`, `pmax:${priceLevelMax}`, `d:${timeBucket}`].join("|");
}

export function jitterLocation(rng: Rng, lat: number, lng: number, maxMeters: number): { lat: number; lng: number } {
  const distanceMeters = rng() * Math.max(0, maxMeters);
  const angle = rng() * Math.PI * 2;

  const metersPerDegreeLat = 111_320;
  const metersPerDegreeLng = Math.max(111_320 * Math.cos((lat * Math.PI) / 180), 1e-6);

  const dLat = (Math.cos(angle) * distanceMeters) / metersPerDegreeLat;
  const dLng = (Math.sin(angle) * distanceMeters) / metersPerDegreeLng;

  return {
    lat: Math.max(-90, Math.min(90, lat + dLat)),
    lng: Math.max(-180, Math.min(180, lng + dLng))
  };
}

export function fakeAddress(rng: Rng): string {
  const streetNum = randInt(rng, 10, 9999);
  const streetName = pick(rng, STREET_NAMES);
  const suffix = pick(rng, STREET_SUFFIXES);
  const city = pick(rng, CITIES);
  const state = pick(rng, STATES);

  return `${streetNum} ${streetName} ${suffix}, ${city}, ${state}`;
}

export function fakePhone(rng: Rng): string {
  const area = randInt(rng, 200, 999);
  const prefix = randInt(rng, 200, 999);
  const line = randInt(rng, 1000, 9999);
  return `tel:+1${area}${prefix}${line}`;
}

export function fakeWebsite(_rng: Rng, nameSlug: string): string {
  const safeSlug = nameSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
  return `https://ourplanplan.com/venue/${safeSlug || "spot"}`;
}

export function fakePhotoUrl(rng: Rng, kind: string): string {
  const photoIndex = randInt(rng, 1, 24);
  const safeKind = kind.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "general";
  return `https://ourplanplan.com/static/${safeKind}/${photoIndex}.jpg`;
}
