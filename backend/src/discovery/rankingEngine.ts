import type { DiscoveryQueryContext, PlaceDocument } from "./types.js";

export type RankingMode = "nearby" | "text" | "category";

export interface PlaceComponentScores {
  distance: number;
  text: number;
  category: number;
  completeness: number;
  quality: number;
  contentRichness: number;
  engagement: number;
  freshness: number;
  openNow: number;
}

export interface RankingWeights {
  distance: number;
  text: number;
  category: number;
  completeness: number;
  quality: number;
  contentRichness: number;
  engagement: number;
  freshness: number;
  openNow: number;
}

export const RANKING_PROFILES: Record<RankingMode, RankingWeights> = {
  nearby: { distance: 0.36, text: 0.06, category: 0.1, completeness: 0.12, quality: 0.12, contentRichness: 0.12, engagement: 0.09, freshness: 0.02, openNow: 0.01 },
  text: { distance: 0.14, text: 0.38, category: 0.1, completeness: 0.1, quality: 0.1, contentRichness: 0.08, engagement: 0.06, freshness: 0.03, openNow: 0.01 },
  category: { distance: 0.18, text: 0.02, category: 0.3, completeness: 0.12, quality: 0.12, contentRichness: 0.14, engagement: 0.08, freshness: 0.03, openNow: 0.01 }
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function tokenize(input: string | undefined): string[] {
  return String(input ?? "").toLowerCase().split(/\s+/).filter(Boolean);
}

export function computeCompletenessScore(place: PlaceDocument): number {
  let score = 0;
  score += place.name ? 0.14 : 0;
  score += place.primaryCategory ? 0.14 : 0;
  score += Number.isFinite(place.lat) && Number.isFinite(place.lng) ? 0.1 : 0;
  score += place.city ? 0.08 : 0;
  score += place.description ? 0.08 : 0;
  score += place.imageUrls.length > 0 ? 0.12 : 0;
  score += (place.reviewCount ?? 0) > 0 ? 0.1 : 0;
  score += place.openNow !== undefined ? 0.04 : 0;
  score += place.sourceAttribution.length > 0 ? 0.06 : 0;
  score += place.updatedAt ? 0.06 : 0;
  score += place.secondaryCategories.length > 0 ? 0.08 : 0;
  return clamp01(score);
}

function distanceScore(distanceMeters: number | undefined, radiusMeters: number): number {
  if (distanceMeters === undefined) return 0.5;
  return clamp01(1 - distanceMeters / Math.max(radiusMeters, 250));
}

function textScore(place: PlaceDocument, query: string | undefined): number {
  const tokens = tokenize(query);
  if (tokens.length === 0) return 0.5;
  const corpus = [place.name, place.description, place.primaryCategory, ...place.secondaryCategories, ...place.keywords].join(" ").toLowerCase();
  const hits = tokens.filter((token) => corpus.includes(token)).length;
  return clamp01(hits / tokens.length);
}

function categoryScore(place: PlaceDocument, categoryToken: string | undefined): number {
  if (!categoryToken) return 0.5;
  const normalized = categoryToken.toLowerCase();
  if (place.primaryCategory.toLowerCase() === normalized) return 1;
  if (place.secondaryCategories.map((item) => item.toLowerCase()).includes(normalized)) return 0.88;
  return 0;
}

function contentRichnessScore(place: PlaceDocument): number {
  const photos = clamp01(Math.log10(1 + place.imageUrls.length) / 1.2);
  const reviews = clamp01(Math.log10(1 + (place.reviewCount ?? 0)) / 3);
  const description = place.description ? 0.2 : 0;
  const firstParty = place.firstPartySignals
    ? clamp01(Math.log10(1 + place.firstPartySignals.reviewCount + place.firstPartySignals.creatorVideoCount + place.firstPartySignals.saveCount + place.firstPartySignals.publicGuideCount) / 3)
    : 0;
  return clamp01((photos * 0.3) + (reviews * 0.25) + (firstParty * 0.3) + description);
}

function engagementScore(place: PlaceDocument): number {
  const reviews = clamp01(Math.log10(1 + (place.reviewCount ?? 0)) / 3);
  const trend = clamp01(place.trendingScore);
  const popularity = clamp01(place.popularityScore);
  const firstPartyEngagement = place.firstPartySignals
    ? clamp01((Math.log10(1 + place.firstPartySignals.helpfulVoteCount) / 2.5) * 0.45 + (place.firstPartySignals.engagementVelocity30d * 0.35) + (place.firstPartySignals.qualityBoost * 0.2))
    : 0;
  return clamp01((reviews * 0.25) + (trend * 0.25) + (popularity * 0.2) + (firstPartyEngagement * 0.3));
}

function freshnessScore(updatedAt: string): number {
  const ageDays = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return clamp01(1 - Math.min(180, ageDays) / 180);
}

export function scorePlaceForMode(input: {
  place: PlaceDocument;
  mode: RankingMode;
  context: DiscoveryQueryContext;
  distanceMeters?: number;
}): { score: number; components: PlaceComponentScores } {
  const { place, mode, context, distanceMeters } = input;
  const components: PlaceComponentScores = {
    distance: distanceScore(distanceMeters, Number(context.radiusMeters ?? 3_000)),
    text: textScore(place, context.query),
    category: categoryScore(place, context.categoryId ?? context.categorySlug),
    completeness: computeCompletenessScore(place),
    quality: clamp01(place.qualityScore),
    contentRichness: contentRichnessScore(place),
    engagement: engagementScore(place),
    freshness: freshnessScore(place.updatedAt),
    openNow: place.openNow ? 1 : 0.35
  };
  const weights = RANKING_PROFILES[mode];
  const score =
    (components.distance * weights.distance)
    + (components.text * weights.text)
    + (components.category * weights.category)
    + (components.completeness * weights.completeness)
    + (components.quality * weights.quality)
    + (components.contentRichness * weights.contentRichness)
    + (components.engagement * weights.engagement)
    + (components.freshness * weights.freshness)
    + (components.openNow * weights.openNow);

  return { score: clamp01(score), components };
}
