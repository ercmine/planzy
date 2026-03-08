import { jaccardSimilarity } from "./normalization.js";
import type { CanonicalPlace, MatchResult, MatchSignal, NormalizedProviderPlace } from "./types.js";

const CHAIN_TOKENS = new Set(["starbucks", "mcdonalds", "target", "walmart", "subway", "burger", "taco"]);

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function isChainLike(name: string): boolean {
  return name
    .toLowerCase()
    .split(/\s+/)
    .some((token) => CHAIN_TOKENS.has(token));
}

function scoreCandidate(normalized: NormalizedProviderPlace, candidate: CanonicalPlace): MatchResult {
  const reasons: MatchSignal[] = [];
  let score = 0;

  if (candidate.sourceLinks.some((link) => link.provider === normalized.provider && link.providerPlaceId === normalized.providerPlaceId)) {
    score += 1.0;
    reasons.push({ signal: "provider_link", weight: 1.0, score: 1, detail: "Exact provider place ID linked" });
  }

  if (normalized.comparisonPhone && candidate.phone && normalized.comparisonPhone === candidate.phone) {
    score += 0.45;
    reasons.push({ signal: "phone", weight: 0.45, score: 1, detail: "Phone exact match" });
  }

  let candidateDomain: string | undefined;
  if (candidate.websiteUrl) {
    try {
      candidateDomain = new URL(candidate.websiteUrl).hostname.replace(/^www\./, "");
    } catch {
      candidateDomain = undefined;
    }
  }
  if (normalized.comparisonWebsiteDomain && candidateDomain && normalized.comparisonWebsiteDomain === candidateDomain) {
    score += 0.35;
    reasons.push({ signal: "website_domain", weight: 0.35, score: 1, detail: "Website domain match" });
  }

  const nameSimilarity = jaccardSimilarity(normalized.normalizedName, candidate.primaryDisplayName.toLowerCase());
  score += nameSimilarity * 0.3;
  reasons.push({ signal: "name_similarity", weight: 0.3, score: nameSimilarity, detail: `name=${nameSimilarity.toFixed(2)}` });

  const addressSimilarity = jaccardSimilarity(normalized.comparisonAddress, [candidate.formattedAddress, candidate.address1, candidate.locality, candidate.region].join(" ").toLowerCase());
  score += addressSimilarity * 0.25;
  reasons.push({ signal: "address_similarity", weight: 0.25, score: addressSimilarity, detail: `address=${addressSimilarity.toFixed(2)}` });

  const distance = haversineMeters(
    { lat: normalized.latitude, lng: normalized.longitude },
    { lat: candidate.latitude, lng: candidate.longitude }
  );

  if (distance < 30) {
    score += 0.3;
    reasons.push({ signal: "geo", weight: 0.3, score: 1, detail: `distance=${distance.toFixed(1)}m` });
  } else if (distance < 120) {
    score += 0.18;
    reasons.push({ signal: "geo", weight: 0.18, score: 0.6, detail: `distance=${distance.toFixed(1)}m` });
  } else if (distance > 2_500) {
    score -= 0.4;
    reasons.push({ signal: "geo_penalty", weight: -0.4, score: 1, detail: `far_distance=${distance.toFixed(1)}m` });
  }

  const categoryOverlap = normalized.providerCategories.some((entry) => candidate.providerCategories.includes(entry));
  if (categoryOverlap) {
    score += 0.1;
    reasons.push({ signal: "category", weight: 0.1, score: 1, detail: "provider category overlap" });
  } else if (candidate.canonicalCategory !== "other" && normalized.providerCategories.length > 0) {
    score -= 0.1;
    reasons.push({ signal: "category_penalty", weight: -0.1, score: 1, detail: "category mismatch" });
  }

  if (isChainLike(normalized.name) && distance > 150) {
    score -= 0.35;
    reasons.push({ signal: "chain_penalty", weight: -0.35, score: 1, detail: "chain-like name requires tight geo evidence" });
  }

  if (score >= 1.0 || reasons.some((reason) => reason.signal === "provider_link")) {
    return { outcome: "exact_linked_match", canonicalPlaceId: candidate.canonicalPlaceId, score, reasons };
  }
  if (score >= 0.78) {
    return { outcome: "confident_auto_merge", canonicalPlaceId: candidate.canonicalPlaceId, score, reasons };
  }
  if (score >= 0.6) {
    return { outcome: "possible_match", canonicalPlaceId: candidate.canonicalPlaceId, score, reasons };
  }
  return { outcome: "no_match", score, reasons };
}

export function findPlaceMatch(normalized: NormalizedProviderPlace, candidates: CanonicalPlace[]): MatchResult {
  let best: MatchResult = { outcome: "no_match", score: -Infinity, reasons: [] };
  for (const candidate of candidates) {
    const scored = scoreCandidate(normalized, candidate);
    if (scored.score > best.score) {
      best = scored;
    }
  }
  if (best.score === -Infinity) {
    return { outcome: "no_match", score: 0, reasons: [] };
  }
  return best;
}
