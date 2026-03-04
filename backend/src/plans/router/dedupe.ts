import type { Plan } from "../plan.js";

const SECONDARY_DISTANCE_METERS = 75;

function normalizeTitle(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function secondaryScore(plan: Plan): [number, number, number] {
  return [plan.rating ?? 0, plan.reviewCount ?? 0, plan.photos?.length ?? 0];
}

function isBetterSecondaryCandidate(candidate: Plan, current: Plan): boolean {
  const a = secondaryScore(candidate);
  const b = secondaryScore(current);
  if (a[0] !== b[0]) {
    return a[0] > b[0];
  }
  if (a[1] !== b[1]) {
    return a[1] > b[1];
  }
  if (a[2] !== b[2]) {
    return a[2] > b[2];
  }
  return false;
}

export function dedupePlans(plans: Plan[]): Plan[] {
  const byId = new Map<string, Plan>();
  const bySecondaryTitle = new Map<string, Plan[]>();

  for (const plan of plans) {
    if (byId.has(plan.id)) {
      continue;
    }

    const normalizedTitle = normalizeTitle(plan.title);
    const bucket = bySecondaryTitle.get(normalizedTitle) ?? [];

    let duplicateIndex = -1;
    for (let i = 0; i < bucket.length; i += 1) {
      const candidate = bucket[i];
      const distance = haversineMeters(
        plan.location.lat,
        plan.location.lng,
        candidate.location.lat,
        candidate.location.lng
      );
      if (distance <= SECONDARY_DISTANCE_METERS) {
        duplicateIndex = i;
        break;
      }
    }

    if (duplicateIndex === -1) {
      byId.set(plan.id, plan);
      bucket.push(plan);
      bySecondaryTitle.set(normalizedTitle, bucket);
      continue;
    }

    const existing = bucket[duplicateIndex];
    if (!isBetterSecondaryCandidate(plan, existing)) {
      continue;
    }

    byId.delete(existing.id);
    byId.set(plan.id, plan);
    bucket[duplicateIndex] = plan;
  }

  return [...byId.values()];
}
