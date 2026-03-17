import type { CanonicalPlace } from "./types.js";

export interface VisitMatchQuery {
  lat: number;
  lng: number;
  reviewedPlaceIds?: string[];
}

export interface VisitMatchResult {
  matched: boolean;
  canonicalPlaceId?: string;
  placeName?: string;
  distanceMeters?: number;
  confidence?: number;
  reason?: string;
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(bLat - aLat);
  const dLng = toRadians(bLng - aLng);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadius * c;
}

export function matchVisitToCanonicalPlace(places: CanonicalPlace[], query: VisitMatchQuery): VisitMatchResult {
  const reviewed = new Set(query.reviewedPlaceIds ?? []);
  const candidates = places
    .filter((place) => place.status === "active" && !place.permanentlyClosed)
    .map((place) => ({
      place,
      distanceMeters: distanceMeters(query.lat, query.lng, place.latitude, place.longitude)
    }))
    .filter((entry) => entry.distanceMeters <= 220)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

  if (candidates.length === 0) return { matched: false, reason: "no_places_nearby" };

  const best = candidates[0];
  const second = candidates[1];

  if (reviewed.has(best.place.canonicalPlaceId)) {
    return { matched: false, reason: "already_reviewed" };
  }

  const ambiguityGap = second == null ? Number.POSITIVE_INFINITY : second.distanceMeters - best.distanceMeters;
  if (second != null && ambiguityGap < 25 && second.distanceMeters < 150) {
    return { matched: false, reason: "ambiguous_dense_area" };
  }

  const proximityScore = Math.max(0, 1 - best.distanceMeters / 220);
  const qualityScore = Math.max(0, Math.min(1, best.place.dataCompletenessScore / 100));
  const confidence = Number((proximityScore * 0.72 + qualityScore * 0.28).toFixed(3));
  if (confidence < 0.55) {
    return { matched: false, reason: "low_confidence" };
  }

  return {
    matched: true,
    canonicalPlaceId: best.place.canonicalPlaceId,
    placeName: best.place.primaryDisplayName,
    distanceMeters: Math.round(best.distanceMeters),
    confidence,
    reason: "matched"
  };
}
