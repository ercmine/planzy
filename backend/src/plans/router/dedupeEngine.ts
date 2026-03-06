import type { Plan } from "../plan.js";
import { haversineMeters } from "./geo.js";
import { mergePlans } from "./merge.js";
import { addressSimilarity, nameSimilarity } from "./similarity.js";

export interface DedupeOptions {
  geoThresholdMeters?: number;
  nameSimilarityMin?: number;
  addressSimilarityMin?: number;
  requireAddressForMerge?: boolean;
  maxGroupSize?: number;
}

export interface DedupeDebugItem {
  keptId: string;
  mergedIds: string[];
  reason: string;
}

export interface DedupeOutput {
  plans: Plan[];
  debug?: { merged: number; groups: DedupeDebugItem[] };
}

interface IndexedPlan {
  index: number;
  plan: Plan;
  bucketKey: string;
}

const DEFAULT_OPTIONS: Required<DedupeOptions> = {
  geoThresholdMeters: 120,
  nameSimilarityMin: 0.72,
  addressSimilarityMin: 0.6,
  requireAddressForMerge: false,
  maxGroupSize: 6
};

function bucketValue(value: number): number {
  return Math.round(value * 1000);
}

function bucketKey(lat: number, lng: number): string {
  return `${bucketValue(lat)}:${bucketValue(lng)}`;
}

function neighboringBuckets(lat: number, lng: number): string[] {
  const latBucket = bucketValue(lat);
  const lngBucket = bucketValue(lng);
  const keys: string[] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      keys.push(`${latBucket + dx}:${lngBucket + dy}`);
    }
  }
  return keys;
}

function isMovieVenueMismatch(a: Plan, b: Plan): boolean {
  const aKind = typeof a.metadata?.kind === "string" ? a.metadata.kind : undefined;
  const bKind = typeof b.metadata?.kind === "string" ? b.metadata.kind : undefined;

  if (a.category !== "movies" && b.category !== "movies") {
    return false;
  }

  const oneIsTmdb = a.source === "tmdb" || b.source === "tmdb";
  if (!oneIsTmdb) {
    return false;
  }

  const aIsTheater = aKind === "theater";
  const bIsTheater = bKind === "theater";
  return !(aIsTheater && bIsTheater);
}

function chooseFallback(candidates: Plan[]): Plan {
  const scored = candidates.map((candidate, index) => {
    const score =
      (candidate.rating ?? 0) * 1000 +
      (candidate.reviewCount ?? 0) * 10 +
      (candidate.photos?.length ?? 0) * 2 +
      (candidate.description ? 1 : 0) +
      (candidate.deepLinks?.website ? 1 : 0);
    return { candidate, index, score };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index || a.candidate.id.localeCompare(b.candidate.id));
  return scored[0]?.candidate ?? candidates[0];
}

function canMerge(anchor: Plan, other: Plan, opts: Required<DedupeOptions>): { ok: boolean; reason: string } {
  if (isMovieVenueMismatch(anchor, other)) {
    return { ok: false, reason: "movie/venue mismatch" };
  }

  const geoDistance = haversineMeters(anchor.location, other.location);
  if (geoDistance > opts.geoThresholdMeters) {
    return { ok: false, reason: `geo>${opts.geoThresholdMeters}` };
  }

  const nameScore = nameSimilarity(anchor.title, other.title);
  if (nameScore < opts.nameSimilarityMin) {
    return { ok: false, reason: `name<${opts.nameSimilarityMin}` };
  }

  const aAddress = anchor.location.address;
  const bAddress = other.location.address;
  if (opts.requireAddressForMerge && (!aAddress || !bAddress)) {
    return { ok: false, reason: "address required" };
  }

  const addrScore = addressSimilarity(aAddress, bAddress);
  if (aAddress && bAddress) {
    if (addrScore < opts.addressSimilarityMin) {
      return { ok: false, reason: `address<${opts.addressSimilarityMin}` };
    }
  } else if (nameScore < 0.85) {
    return { ok: false, reason: "missing address and weak name" };
  }

  return { ok: true, reason: `geo=${geoDistance.toFixed(1)},name=${nameScore.toFixed(2)},addr=${addrScore.toFixed(2)}` };
}

export function dedupeAndMergePlans(plans: Plan[], opts?: DedupeOptions): DedupeOutput {
  const resolvedOpts: Required<DedupeOptions> = {
    ...DEFAULT_OPTIONS,
    ...opts
  };

  const uniqueById = new Map<string, Plan>();
  for (const plan of plans) {
    if (!uniqueById.has(plan.id)) {
      uniqueById.set(plan.id, plan);
    }
  }

  const uniquePlans = [...uniqueById.values()];
  const indexed: IndexedPlan[] = uniquePlans.map((plan, index) => ({
    index,
    plan,
    bucketKey: bucketKey(plan.location.lat, plan.location.lng)
  }));

  const bucketMap = new Map<string, IndexedPlan[]>();
  for (const item of indexed) {
    const bucketItems = bucketMap.get(item.bucketKey) ?? [];
    bucketItems.push(item);
    bucketMap.set(item.bucketKey, bucketItems);
  }

  for (const [key, values] of bucketMap.entries()) {
    values.sort((a, b) => a.index - b.index || a.plan.id.localeCompare(b.plan.id));
    bucketMap.set(key, values);
  }

  const grouped = new Set<number>();
  const output: Plan[] = [];
  const groups: DedupeDebugItem[] = [];

  for (const item of indexed) {
    if (grouped.has(item.index)) {
      continue;
    }

    const group: IndexedPlan[] = [item];
    const reasons: string[] = [];
    const nearbyKeys = neighboringBuckets(item.plan.location.lat, item.plan.location.lng);
    const compared = nearbyKeys
      .flatMap((key) => bucketMap.get(key) ?? [])
      .filter((candidate) => candidate.index > item.index && !grouped.has(candidate.index))
      .sort((a, b) => a.index - b.index || a.plan.id.localeCompare(b.plan.id));

    for (const candidate of compared) {
      if (group.length >= resolvedOpts.maxGroupSize) {
        reasons.push("maxGroupSize reached");
        break;
      }

      const decision = canMerge(item.plan, candidate.plan, resolvedOpts);
      if (!decision.ok) {
        continue;
      }

      group.push(candidate);
      reasons.push(`${candidate.plan.id}:${decision.reason}`);
    }

    if (group.length === 1) {
      grouped.add(item.index);
      output.push(item.plan);
      continue;
    }

    const candidates = group.map((entry) => entry.plan);
    try {
      const merged = mergePlans(candidates);
      grouped.add(item.index);
      for (const member of group.slice(1)) {
        grouped.add(member.index);
      }
      output.push(merged.plan);
      groups.push({
        keptId: merged.plan.id,
        mergedIds: merged.mergedFrom,
        reason: reasons.join("; ") || "merged"
      });
    } catch {
      const fallback = chooseFallback(candidates);
      grouped.add(item.index);
      for (const member of group.slice(1)) {
        grouped.add(member.index);
      }
      output.push(fallback);
      groups.push({
        keptId: fallback.id,
        mergedIds: candidates.map((candidate) => candidate.id),
        reason: "merge validation failed; fallback to best single"
      });
    }
  }

  return {
    plans: output,
    debug: {
      merged: groups.length,
      groups
    }
  };
}
