import type { CanonicalPlace } from "./types.js";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapDiscoveryQuery {
  bounds: MapBounds;
  categories?: string[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  limit?: number;
}

export interface MapDiscoveryPlaceSummary {
  canonicalPlaceId: string;
  name: string;
  category: string;
  city?: string;
  region?: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  rating: number;
  distanceMeters?: number;
  descriptionSnippet?: string;
  thumbnailUrl?: string;
  dataCompletenessScore: number;
  openNow?: boolean;
  reviewCount: number;
  creatorVideoCount: number;
}

function isWithinBounds(place: CanonicalPlace, bounds: MapBounds): boolean {
  if (place.latitude > bounds.north || place.latitude < bounds.south) return false;
  if (bounds.west <= bounds.east) {
    return place.longitude >= bounds.west && place.longitude <= bounds.east;
  }
  return place.longitude >= bounds.west || place.longitude <= bounds.east;
}

function haversineMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function normalizeCategory(value: string): string {
  return value.trim().toLowerCase();
}

function buildGridKey(place: CanonicalPlace, bounds: MapBounds, buckets: number): string {
  const latSpan = Math.max(Math.abs(bounds.north - bounds.south), 0.0001);
  const lngSpan = Math.max(Math.abs(bounds.east - bounds.west), 0.0001);
  const latIndex = Math.floor(((place.latitude - bounds.south) / latSpan) * buckets);
  const lngIndex = Math.floor(((place.longitude - bounds.west) / lngSpan) * buckets);
  return `${Math.max(0, Math.min(buckets - 1, latIndex))}:${Math.max(0, Math.min(buckets - 1, lngIndex))}`;
}

export function searchCanonicalPlacesInBounds(places: CanonicalPlace[], query: MapDiscoveryQuery): MapDiscoveryPlaceSummary[] {
  const categories = new Set((query.categories ?? []).map(normalizeCategory).filter(Boolean));
  const centerLat = query.centerLat ?? (query.bounds.north + query.bounds.south) / 2;
  const centerLng = query.centerLng ?? (query.bounds.east + query.bounds.west) / 2;
  const baseLimit = Math.min(Math.max(query.limit ?? 80, 1), 200);
  const zoom = Math.max(3, Math.min(20, query.zoom ?? 13));
  const gridBuckets = zoom >= 14 ? 8 : zoom >= 11 ? 6 : 4;
  const perBucketCap = zoom >= 14 ? 5 : 3;

  const filtered = places
    .filter((place) => place.status === "active")
    .filter((place) => isWithinBounds(place, query.bounds))
    .filter((place) => {
      if (categories.size === 0) return true;
      return categories.has(normalizeCategory(place.canonicalCategory));
    })
    .map((place) => {
      const distanceMeters = haversineMeters(centerLat, centerLng, place.latitude, place.longitude);
      const qualityScore = Math.max(0, Math.min(1, place.dataCompletenessScore / 100));
      const distanceScore = 1 / (1 + distanceMeters / 3000);
      const openNowBonus = place.openNow ? 0.08 : 0;
      const richnessBonus = (place.photoGallery.length > 0 ? 0.06 : 0) + (place.longDescription || place.shortDescription ? 0.06 : 0);
      const score = distanceScore * 0.45 + qualityScore * 0.45 + openNowBonus + richnessBonus;
      return { place, score, distanceMeters };
    })
    .sort((a, b) => b.score - a.score);

  const bucketCounts = new Map<string, number>();
  const selected: Array<{ place: CanonicalPlace; score: number; distanceMeters: number }> = [];
  for (const candidate of filtered) {
    const key = buildGridKey(candidate.place, query.bounds, gridBuckets);
    const current = bucketCounts.get(key) ?? 0;
    if (current >= perBucketCap) continue;
    bucketCounts.set(key, current + 1);
    selected.push(candidate);
    if (selected.length >= baseLimit) break;
  }

  return selected.map(({ place, score, distanceMeters }) => ({
    canonicalPlaceId: place.canonicalPlaceId,
    name: place.primaryDisplayName,
    category: place.canonicalCategory,
    city: place.locality,
    region: place.region,
    neighborhood: place.neighborhood,
    latitude: place.latitude,
    longitude: place.longitude,
    rating: Number(score.toFixed(4)),
    distanceMeters,
    descriptionSnippet: place.shortDescription,
    thumbnailUrl: place.primaryPhoto?.thumbnailUrl ?? place.primaryPhoto?.url,
    dataCompletenessScore: place.dataCompletenessScore,
    openNow: place.openNow,
    reviewCount: Math.max(0, Math.round((place.dataCompletenessScore / 100) * 24)),
    creatorVideoCount: place.photoGallery.length > 0 ? 1 : 0
  }));
}
