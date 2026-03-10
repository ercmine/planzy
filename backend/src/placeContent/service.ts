import { computeFirstPartyRankingSignals } from "./ranking.js";
import type { PlaceContentStore } from "./store.js";
import type { ContentEngagementRecord, CreatorVideoRecord, FirstPartyPlaceMetrics, GuideRecord, ReviewRecord } from "./types.js";

interface PlaceContentLogger {
  info?(event: string, payload: Record<string, unknown>): void;
}

export class PlaceContentService {
  constructor(private readonly store: PlaceContentStore, private readonly logger?: PlaceContentLogger) {}

  async createReview(input: {
    canonicalPlaceId: string;
    authorUserId: string;
    authorProfileId?: string;
    body: string;
    rating?: number;
    status?: ReviewRecord["status"];
    visibility?: ReviewRecord["visibility"];
    trustedReview?: boolean;
    qualityScore?: number;
    verifiedVisitScore?: number;
  }): Promise<ReviewRecord> {
    const review = await this.store.createReview({
      canonicalPlaceId: input.canonicalPlaceId,
      authorUserId: input.authorUserId,
      authorProfileId: input.authorProfileId,
      body: input.body,
      rating: input.rating,
      status: input.status ?? "published",
      visibility: input.visibility ?? "public",
      trustedReview: input.trustedReview ?? false,
      qualityScore: input.qualityScore ?? 0.6,
      verifiedVisitScore: input.verifiedVisitScore ?? 0
    });
    this.logger?.info?.("place_content.review_created", { canonicalPlaceId: review.canonicalPlaceId, reviewId: review.id });
    await this.refreshPlaceMetrics(input.canonicalPlaceId);
    return review;
  }

  async createCreatorVideo(input: {
    canonicalPlaceId: string;
    authorUserId: string;
    mediaAssetId: string;
    thumbnailAssetId?: string;
    title?: string;
    caption?: string;
    durationSec?: number;
    status?: CreatorVideoRecord["status"];
    visibility?: CreatorVideoRecord["visibility"];
    qualityScore?: number;
    publishedAt?: string;
  }): Promise<CreatorVideoRecord> {
    const video = await this.store.createVideo({
      ...input,
      status: input.status ?? "published",
      visibility: input.visibility ?? "public",
      qualityScore: input.qualityScore ?? 0.7
    });
    this.logger?.info?.("place_content.video_created", { canonicalPlaceId: video.canonicalPlaceId, videoId: video.id });
    await this.refreshPlaceMetrics(input.canonicalPlaceId);
    return video;
  }

  async savePlace(input: { userId: string; canonicalPlaceId: string; sourceContext?: "search" | "place_detail" | "guide" | "feed" | "other" }) {
    const save = await this.store.upsertSave(input);
    this.logger?.info?.("place_content.save_upserted", { canonicalPlaceId: save.canonicalPlaceId, userId: save.userId });
    await this.refreshPlaceMetrics(input.canonicalPlaceId);
    return save;
  }

  async unsavePlace(userId: string, canonicalPlaceId: string): Promise<void> {
    await this.store.deleteSave(userId, canonicalPlaceId);
    this.logger?.info?.("place_content.save_removed", { canonicalPlaceId, userId });
    await this.refreshPlaceMetrics(canonicalPlaceId);
  }

  async createGuide(input: { ownerUserId: string; title: string; description?: string; visibility?: GuideRecord["visibility"]; status?: GuideRecord["status"]; coverAssetId?: string; }) {
    const guide = await this.store.createGuide({
      ownerUserId: input.ownerUserId,
      title: input.title,
      description: input.description,
      visibility: input.visibility ?? "private",
      status: input.status ?? "published",
      coverAssetId: input.coverAssetId
    });
    this.logger?.info?.("place_content.guide_created", { guideId: guide.id, ownerUserId: guide.ownerUserId });
    return guide;
  }

  async addGuidePlace(input: { guideId: string; canonicalPlaceId: string; note?: string }): Promise<void> {
    await this.store.addGuideItem(input);
    this.logger?.info?.("place_content.guide_place_added", { guideId: input.guideId, canonicalPlaceId: input.canonicalPlaceId });
    await this.store.appendEngagement({
      canonicalPlaceId: input.canonicalPlaceId,
      contentType: "guide",
      contentId: input.guideId,
      eventType: "guide_add",
      createdAt: new Date().toISOString(),
      value: 1
    });
    await this.refreshPlaceMetrics(input.canonicalPlaceId);
  }

  async recordEngagement(input: Omit<ContentEngagementRecord, "id">): Promise<void> {
    await this.store.appendEngagement(input);
    await this.refreshPlaceMetrics(input.canonicalPlaceId);
  }

  async getPlaceDetailContent(canonicalPlaceId: string): Promise<{ reviews: ReviewRecord[]; videos: CreatorVideoRecord[]; saveCount: number; guides: GuideRecord[]; metrics: FirstPartyPlaceMetrics | undefined; }> {
    const reviews = (await this.store.listReviewsByPlace(canonicalPlaceId)).filter((item) => item.status === "published" && item.visibility === "public");
    const videos = (await this.store.listVideosByPlace(canonicalPlaceId)).filter((item) => item.status === "published" && item.visibility === "public");
    const saves = await this.store.listSavesByPlace(canonicalPlaceId);
    const guides = (await this.store.listGuidesByPlace(canonicalPlaceId)).filter((item) => item.status === "published" && item.visibility === "public");
    const metrics = await this.store.getPlaceMetrics(canonicalPlaceId);
    return { reviews, videos, saveCount: saves.length, guides, metrics };
  }

  async getCreatorContent(authorUserId: string): Promise<{ reviews: ReviewRecord[]; videos: CreatorVideoRecord[]; guides: GuideRecord[] }> {
    const allReviews = await this.store.listAllReviews();
    const allVideos = await this.store.listAllVideos();
    const allGuides = await this.store.listAllGuides();
    return {
      reviews: allReviews.filter((item) => item.authorUserId === authorUserId && item.status === "published"),
      videos: allVideos.filter((item) => item.authorUserId === authorUserId && item.status === "published"),
      guides: allGuides.filter((item) => item.ownerUserId === authorUserId && item.status === "published")
    };
  }

  async getPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics | undefined> {
    return this.store.getPlaceMetrics(canonicalPlaceId);
  }

  async getRankingBoost(canonicalPlaceId: string) {
    const metrics = await this.store.getPlaceMetrics(canonicalPlaceId);
    if (!metrics) return undefined;
    return computeFirstPartyRankingSignals(metrics);
  }

  async refreshPlaceMetrics(canonicalPlaceId: string): Promise<FirstPartyPlaceMetrics> {
    const [reviews, videos, saves, guides, engagement] = await Promise.all([
      this.store.listReviewsByPlace(canonicalPlaceId),
      this.store.listVideosByPlace(canonicalPlaceId),
      this.store.listSavesByPlace(canonicalPlaceId),
      this.store.listGuidesByPlace(canonicalPlaceId),
      this.store.listEngagementByPlace(canonicalPlaceId)
    ]);

    const visibleReviews = reviews.filter((item) => item.status === "published" && item.visibility === "public");
    const visibleVideos = videos.filter((item) => item.status === "published" && item.visibility === "public");
    const publicGuides = guides.filter((item) => item.status === "published" && item.visibility === "public");
    const now = Date.now();
    const velocityWindowStart = now - (30 * 24 * 60 * 60 * 1000);
    const engagementVelocity30d = engagement.filter((item) => new Date(item.createdAt).getTime() >= velocityWindowStart).reduce((sum, item) => sum + item.value, 0) / 30;

    const trustedReviewCount = visibleReviews.filter((item) => item.trustedReview).length;
    const helpfulVoteCount = visibleReviews.reduce((sum, item) => sum + item.helpfulCount, 0)
      + engagement.filter((item) => item.eventType === "helpful_vote").reduce((sum, item) => sum + item.value, 0);

    const qualityAvg = (visibleReviews.reduce((sum, item) => sum + item.qualityScore, 0) + visibleVideos.reduce((sum, item) => sum + item.qualityScore, 0))
      / Math.max(1, visibleReviews.length + visibleVideos.length);

    const metrics: FirstPartyPlaceMetrics = {
      canonicalPlaceId,
      reviewCount: visibleReviews.length,
      creatorVideoCount: visibleVideos.length,
      saveCount: saves.length,
      publicGuideCount: publicGuides.length,
      trustedReviewCount,
      helpfulVoteCount,
      engagementVelocity30d: Math.min(1, engagementVelocity30d / 10),
      contentRichnessScore: Math.min(1, (Math.log10(1 + visibleReviews.length + visibleVideos.length + publicGuides.length + saves.length) / 2)),
      trustScore: Math.min(1, (trustedReviewCount * 2 + helpfulVoteCount + visibleReviews.reduce((sum, item) => sum + item.verifiedVisitScore, 0)) / Math.max(1, visibleReviews.length * 5)),
      firstPartyQualityBoost: Math.min(1, qualityAvg),
      updatedAt: new Date().toISOString()
    };

    this.logger?.info?.("place_content.metrics_refreshed", { canonicalPlaceId, reviewCount: metrics.reviewCount, videoCount: metrics.creatorVideoCount, saveCount: metrics.saveCount });
    return this.store.upsertPlaceMetrics(metrics);
  }

}
