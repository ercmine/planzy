import type { VideoAsset, VideoFeedItem, FeedScope, FeedScopeProfile, FeedScopeRequestContext, PlaceFeedSignals, CreatorFeedSignals, RankingSignalBreakdown, VideoFeedCursorPayload, FeedObservabilityEvent, FeedScoreComponents } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_RADIUS_METERS = 15_000;
const REGIONAL_RADIUS_METERS = 200_000;

export const FEED_SCOPE_PROFILES: Record<FeedScope, FeedScopeProfile> = {
  local: {
    localityWeight: 0.29,
    placeQualityWeight: 0.18,
    placeRichnessWeight: 0.14,
    creatorQualityWeight: 0.1,
    freshnessWeight: 0.14,
    engagementWeight: 0.1,
    trustWeight: 0.05,
    diversityWeight: 0.1,
    minCandidateCount: 12
  },
  regional: {
    localityWeight: 0.18,
    placeQualityWeight: 0.22,
    placeRichnessWeight: 0.14,
    creatorQualityWeight: 0.12,
    freshnessWeight: 0.12,
    engagementWeight: 0.14,
    trustWeight: 0.08,
    diversityWeight: 0.1,
    minCandidateCount: 12
  },
  global: {
    localityWeight: 0.03,
    placeQualityWeight: 0.24,
    placeRichnessWeight: 0.17,
    creatorQualityWeight: 0.16,
    freshnessWeight: 0.1,
    engagementWeight: 0.2,
    trustWeight: 0.1,
    diversityWeight: 0.12,
    minCandidateCount: 16
  }
};

export interface FeedRankCandidate {
  video: VideoAsset;
  place: PlaceFeedSignals;
  creator: CreatorFeedSignals;
  localityScore: number;
  scoreComponents: FeedScoreComponents;
  rawScore: number;
}

export interface FeedRankingInput {
  scope: FeedScope;
  allVideos: VideoAsset[];
  context?: FeedScopeRequestContext;
  placeSignalsFor: (placeId: string) => PlaceFeedSignals;
  creatorSignalsFor: (creatorId: string) => CreatorFeedSignals;
  cursor?: string;
  limit: number;
}

export interface FeedRankingOutput {
  ranked: Array<{ item: VideoFeedItem; sortKey: string }>;
  nextCursor?: string;
  observability: FeedObservabilityEvent;
}

export function rankPlaceLinkedVideoFeed(input: FeedRankingInput): FeedRankingOutput {
  const profile = FEED_SCOPE_PROFILES[input.scope];
  const filtered = filterByScope(input.allVideos, input.scope, input.context, profile.minCandidateCount);

  const scored: FeedRankCandidate[] = filtered
    .map((video) => {
      const place = input.placeSignalsFor(video.canonicalPlaceId);
      const creator = input.creatorSignalsFor(video.authorUserId);
      const localityScore = computeLocalityScore({ scope: input.scope, context: input.context, place });
      const freshnessScore = computeFreshnessScore(video.lifecycle.publishedAt ?? video.lifecycle.createdAt);
      const engagementScore = normalize01((video.engagement?.views ?? 0) / 2000 + (video.engagement?.likes ?? 0) / 500 + (video.engagement?.saves ?? 0) / 300 + (video.engagement?.shares ?? 0) / 80 + (video.engagement?.completionRate ?? 0));
      const components: FeedScoreComponents = {
        locality: localityScore,
        placeQuality: place.qualityScore,
        placeRichness: place.contentRichnessScore,
        creatorQuality: creator.qualityScore,
        freshness: freshnessScore,
        engagement: engagementScore,
        trust: normalize01((place.trustedReviewScore + creator.trustScore) / 2),
        diversityPenalty: 0
      };
      const rawScore = (
        components.locality * profile.localityWeight
        + components.placeQuality * profile.placeQualityWeight
        + components.placeRichness * profile.placeRichnessWeight
        + components.creatorQuality * profile.creatorQualityWeight
        + components.freshness * profile.freshnessWeight
        + components.engagement * profile.engagementWeight
        + components.trust * profile.trustWeight
      );
      return { video, place, creator, localityScore, scoreComponents: components, rawScore };
    })
    .sort((a, b) => b.rawScore - a.rawScore || (b.video.lifecycle.publishedAt ?? b.video.lifecycle.createdAt).localeCompare(a.video.lifecycle.publishedAt ?? a.video.lifecycle.createdAt));

  const diversified = diversify(scored, profile.diversityWeight);
  const offset = decodeCursor(input.cursor)?.offset ?? 0;
  const sliced = diversified.slice(offset, offset + input.limit);
  const nextOffset = offset + sliced.length;

  return {
    ranked: sliced.map((entry) => ({ item: toFeedItem(entry, input.scope), sortKey: `${entry.rawScore.toFixed(5)}:${entry.video.id}` })),
    nextCursor: nextOffset < diversified.length ? encodeCursor({ offset: nextOffset, scope: input.scope }) : undefined,
    observability: {
      scope: input.scope,
      candidateCount: filtered.length,
      rankedCount: diversified.length,
      fallbackApplied: filtered.length < profile.minCandidateCount,
      zeroResult: sliced.length === 0,
      diversitySuppressions: diversified.filter((row) => row.scoreComponents.diversityPenalty < 0).length,
      averageComponentScores: averageComponents(sliced.map((row) => row.scoreComponents))
    }
  };
}

function filterByScope(videos: VideoAsset[], scope: FeedScope, context: FeedScopeRequestContext | undefined, minCount: number): VideoAsset[] {
  const nowVisible = videos.filter((video) => video.status === "published" && video.moderationStatus === "approved" && video.visibility === "public");
  if (scope === "global") return nowVisible;
  const primaryRadius = scope === "local" ? LOCAL_RADIUS_METERS : REGIONAL_RADIUS_METERS;
  const widenedRadius = scope === "local" ? REGIONAL_RADIUS_METERS : 500_000;
  const withinPrimary = nowVisible.filter((video) => {
    const distance = video.feedDebug?.distanceMeters;
    if (typeof distance === "number") return distance <= primaryRadius;
    return locationMatchesContext(video, context);
  });
  if (withinPrimary.length >= minCount) return withinPrimary;

  const withinWidened = nowVisible.filter((video) => {
    const distance = video.feedDebug?.distanceMeters;
    if (typeof distance === "number") return distance <= widenedRadius;
    return locationMatchesContext(video, context);
  });

  return withinWidened.length ? withinWidened : nowVisible;
}

function locationMatchesContext(video: VideoAsset, context?: FeedScopeRequestContext): boolean {
  if (!context) return true;
  if (context.city && video.feedDebug?.placeCity && context.city.toLowerCase() === video.feedDebug.placeCity.toLowerCase()) return true;
  if (context.region && video.feedDebug?.placeRegion && context.region.toLowerCase() === video.feedDebug.placeRegion.toLowerCase()) return true;
  return !context.city && !context.region;
}

function computeLocalityScore(input: { scope: FeedScope; context?: FeedScopeRequestContext; place: PlaceFeedSignals }): number {
  if (input.scope === "global") return 0.5;
  if (input.context?.lat !== undefined && input.context?.lng !== undefined && input.place.lat !== undefined && input.place.lng !== undefined) {
    const distance = haversineMeters(input.context.lat, input.context.lng, input.place.lat, input.place.lng);
    const radius = input.scope === "local" ? LOCAL_RADIUS_METERS : REGIONAL_RADIUS_METERS;
    return normalize01(1 - distance / radius);
  }
  if (input.context?.city && input.place.city && input.context.city.toLowerCase() === input.place.city.toLowerCase()) return 1;
  if (input.context?.region && input.place.region && input.context.region.toLowerCase() === input.place.region.toLowerCase()) return 0.8;
  return 0.45;
}

function diversify(scored: FeedRankCandidate[], diversityWeight: number): FeedRankCandidate[] {
  const creatorSeen = new Map<string, number>();
  const placeSeen = new Map<string, number>();
  const ranked = [...scored];
  for (const item of ranked) {
    const creatorPenalty = Math.min((creatorSeen.get(item.video.authorUserId) ?? 0) * 0.08, 0.32);
    const placePenalty = Math.min((placeSeen.get(item.video.canonicalPlaceId) ?? 0) * 0.1, 0.4);
    const penalty = (creatorPenalty + placePenalty) * diversityWeight;
    item.scoreComponents.diversityPenalty = -penalty;
    item.rawScore -= penalty;
    creatorSeen.set(item.video.authorUserId, (creatorSeen.get(item.video.authorUserId) ?? 0) + 1);
    placeSeen.set(item.video.canonicalPlaceId, (placeSeen.get(item.video.canonicalPlaceId) ?? 0) + 1);
  }
  return ranked.sort((a, b) => b.rawScore - a.rawScore);
}

function toFeedItem(candidate: FeedRankCandidate, scope: FeedScope): VideoFeedItem {
  const video = candidate.video;
  const place = candidate.place;
  const creator = candidate.creator;
  const breakdown: RankingSignalBreakdown = {
    finalScore: candidate.rawScore,
    components: candidate.scoreComponents
  };
  return {
    videoId: video.id,
    placeId: video.canonicalPlaceId,
    placeName: place.name,
    placeCategory: place.category,
    regionLabel: [place.city, place.region].filter(Boolean).join(", ") || "Unknown",
    placeSummary: {
      canonicalPlaceId: video.canonicalPlaceId,
      name: place.name,
      category: place.category,
      city: place.city,
      region: place.region,
      qualityScore: place.qualityScore,
      contentRichnessScore: place.contentRichnessScore,
      trustedReviewScore: place.trustedReviewScore,
      distanceMeters: typeof place.distanceMeters === "number" ? Math.round(place.distanceMeters) : undefined
    },
    creatorSummary: {
      creatorUserId: video.authorUserId,
      displayName: creator.displayName,
      handle: creator.handle,
      qualityScore: creator.qualityScore,
      trustScore: creator.trustScore
    },
    title: video.title,
    caption: video.caption,
    creatorUserId: video.authorUserId,
    playbackUrl: video.processedPlaybackUrl,
    thumbnailUrl: video.thumbnailPlaybackUrl,
    coverUrl: video.coverPlaybackUrl,
    status: video.status,
    moderationStatus: video.moderationStatus,
    publishedAt: video.lifecycle.publishedAt,
    rating: video.rating,
    engagementSummary: {
      views: video.engagement?.views ?? 0,
      likes: video.engagement?.likes ?? 0,
      saves: video.engagement?.saves ?? 0,
      shares: video.engagement?.shares ?? 0,
      completionRate: video.engagement?.completionRate ?? 0
    },
    scope,
    ranking: breakdown
  };
}

function averageComponents(rows: FeedScoreComponents[]): FeedScoreComponents {
  if (rows.length === 0) {
    return { locality: 0, placeQuality: 0, placeRichness: 0, creatorQuality: 0, freshness: 0, engagement: 0, trust: 0, diversityPenalty: 0 };
  }
  const totals = rows.reduce<FeedScoreComponents>((acc, row) => ({
    locality: acc.locality + row.locality,
    placeQuality: acc.placeQuality + row.placeQuality,
    placeRichness: acc.placeRichness + row.placeRichness,
    creatorQuality: acc.creatorQuality + row.creatorQuality,
    freshness: acc.freshness + row.freshness,
    engagement: acc.engagement + row.engagement,
    trust: acc.trust + row.trust,
    diversityPenalty: acc.diversityPenalty + row.diversityPenalty
  }), { locality: 0, placeQuality: 0, placeRichness: 0, creatorQuality: 0, freshness: 0, engagement: 0, trust: 0, diversityPenalty: 0 });
  return {
    locality: totals.locality / rows.length,
    placeQuality: totals.placeQuality / rows.length,
    placeRichness: totals.placeRichness / rows.length,
    creatorQuality: totals.creatorQuality / rows.length,
    freshness: totals.freshness / rows.length,
    engagement: totals.engagement / rows.length,
    trust: totals.trust / rows.length,
    diversityPenalty: totals.diversityPenalty / rows.length
  };
}

function computeFreshnessScore(ts: string): number {
  const ageDays = Math.max(0, (Date.now() - new Date(ts).getTime()) / DAY_MS);
  return normalize01(1 / (1 + ageDays / 14));
}

function normalize01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function encodeCursor(payload: VideoFeedCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(raw?: string): VideoFeedCursorPayload | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as VideoFeedCursorPayload;
    if (typeof parsed.offset !== "number") return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}
