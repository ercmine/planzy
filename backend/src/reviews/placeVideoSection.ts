import type { PlaceReview, ReviewMedia, ReviewsStore } from "./store.js";

export interface PlaceVideoQueryInput {
  placeId: string;
  viewerUserId?: string;
  cursor?: string;
  limit?: number;
  filter?: "all" | "creator" | "user" | "trusted" | "verified";
}

export interface PlaceVideoAuthorSummary {
  profileId: string;
  profileType: PlaceReview["authorProfileType"];
  displayName: string;
  handle?: string;
  avatarUrl?: string;
}

export interface PlaceReviewVideoItem {
  id: string;
  reviewId: string;
  placeId: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  durationMs?: number;
  title?: string;
  caption?: string;
  createdAt: string;
  author: PlaceVideoAuthorSummary;
  badges: string[];
  labels: string[];
  helpfulCount: number;
  trustRank: number;
}

export interface PlaceReviewVideoSection {
  placeId: string;
  featuredVideo?: PlaceReviewVideoItem;
  videos: PlaceReviewVideoItem[];
  nextCursor?: string;
  totalVisibleVideos: number;
}

interface RankedVideo extends PlaceReviewVideoItem { score: number; dedupeKey: string; }

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  const parsed = Number(Buffer.from(cursor, "base64url").toString("utf8"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

function labelsFor(review: PlaceReview): string[] {
  const labels: string[] = [];
  if (review.authorProfileType === "CREATOR") labels.push("creator_review");
  if (review.trust.reviewTrustDesignation === "trusted" || review.trust.reviewTrustDesignation === "trusted_verified") labels.push("trusted");
  if (review.trust.isVerifiedVisit) labels.push("verified_visit");
  return labels;
}

function rankVideo(review: PlaceReview, media: ReviewMedia): number {
  const ageDays = Math.max(0, (Date.now() - Date.parse(review.createdAt)) / 86_400_000);
  const recency = Math.max(0, 16 - Math.min(ageDays, 16));
  const creator = review.authorProfileType === "CREATOR" ? 18 : 0;
  const trusted = ["trusted", "trusted_verified"].includes(review.trust.reviewTrustDesignation) ? 22 : 0;
  const verified = review.trust.isVerifiedVisit ? 10 : 0;
  const quality = media.variants.thumbnailUrl || media.posterUrl ? 6 : 0;
  return trusted + creator + verified + review.helpfulCount + review.trust.rankingBoostWeight + recency + quality;
}

function toVideoItem(review: PlaceReview, media: ReviewMedia): RankedVideo | null {
  if (media.mediaType !== "video") return null;
  if (!media.playbackUrl) return null;
  if (media.processingState !== "ready") return null;
  if (media.moderationState !== "published") return null;
  if (media.visibilityState !== "public") return null;
  if (media.removedAt) return null;

  const labels = labelsFor(review);
  const score = rankVideo(review, media);
  return {
    id: media.id,
    reviewId: review.id,
    placeId: review.placeId,
    playbackUrl: media.playbackUrl,
    thumbnailUrl: media.variants.thumbnailUrl,
    posterUrl: media.posterUrl,
    durationMs: media.durationMs,
    title: media.caption,
    caption: media.caption,
    createdAt: review.createdAt,
    author: {
      profileId: review.authorProfileId,
      profileType: review.authorProfileType,
      displayName: review.author.displayName,
      handle: review.author.handle,
      avatarUrl: review.author.avatarUrl
    },
    badges: review.trust.trustBadges,
    labels,
    helpfulCount: review.helpfulCount,
    trustRank: review.trust.rankingBoostWeight,
    score,
    dedupeKey: `${review.authorProfileId}:${media.playbackUrl}`
  };
}

export async function getPlaceReviewVideoSection(store: ReviewsStore, input: PlaceVideoQueryInput): Promise<PlaceReviewVideoSection> {
  const filter = input.filter ?? "all";
  const perPage = Math.max(1, Math.min(input.limit ?? 12, 30));
  const response = await store.listByPlace({
    placeId: input.placeId,
    viewerUserId: input.viewerUserId,
    sort: "trusted",
    limit: 100
  });

  const seen = new Set<string>();
  const authorCounts = new Map<string, number>();
  const ranked = response.reviews.flatMap((review) => {
    const include = filter === "all"
      || (filter === "creator" && review.authorProfileType === "CREATOR")
      || (filter === "user" && review.authorProfileType !== "CREATOR")
      || (filter === "trusted" && (review.trust.reviewTrustDesignation === "trusted" || review.trust.reviewTrustDesignation === "trusted_verified"))
      || (filter === "verified" && review.trust.isVerifiedVisit);
    if (!include) return [];
    return review.media.map((media) => toVideoItem(review, media)).filter((item): item is RankedVideo => Boolean(item));
  }).filter((item) => {
    if (seen.has(item.dedupeKey)) return false;
    seen.add(item.dedupeKey);
    return true;
  });

  ranked.sort((a, b) => (b.score - a.score) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));

  const diversified: RankedVideo[] = [];
  const pool = [...ranked];
  while (pool.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i]!;
      const authorCount = authorCounts.get(candidate.author.profileId) ?? 0;
      const effective = candidate.score - authorCount * 6;
      if (effective > bestScore) {
        bestScore = effective;
        bestIndex = i;
      }
    }
    const [picked] = pool.splice(bestIndex, 1);
    diversified.push(picked!);
    authorCounts.set(picked!.author.profileId, (authorCounts.get(picked!.author.profileId) ?? 0) + 1);
  }

  const start = decodeCursor(input.cursor);
  const page = diversified.slice(start, start + perPage);
  const nextOffset = start + page.length;

  const items = page.map(({ score: _score, dedupeKey: _key, ...rest }) => rest);
  const featuredVideo = diversified.find((item) => item.labels.includes("trusted") || item.labels.includes("creator_review")) ?? diversified[0];
  const featured = featuredVideo ? (({ score: _s, dedupeKey: _k, ...rest }) => rest)(featuredVideo) : undefined;

  return {
    placeId: input.placeId,
    featuredVideo: featured,
    videos: items,
    nextCursor: nextOffset < diversified.length ? encodeCursor(nextOffset) : undefined,
    totalVisibleVideos: diversified.length
  };
}
