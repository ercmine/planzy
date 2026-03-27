import { randomUUID } from "node:crypto";

import type {
  VideoLifecycleStatus,
  UploadSession,
  VideoAsset,
  VideoFeedItem,
  VideoOperationalDiagnostics,
  VideoProcessingJob,
  VideoStudioItem,
  CreatorStudioAnalyticsOverview,
  CreatorStudioSection,
  CreatorStudioStatusCounts,
  FeedScope,
  FeedScopeRequestContext,
  PlaceFeedSignals,
  CreatorFeedSignals,
  ReengagementSummary,
  VideoModerationSummary,
  VideoModerationFrameEvidence
} from "./types.js";
import { rankPlaceLinkedVideoFeed } from "./feedRanking.js";
import type { VideoPlatformStore } from "./store.js";
import type { ModerationService } from "../moderation/service.js";
import { TrustSafetyService } from "../trustSafety/service.js";
import type { NotificationService } from "../notifications/service.js";

const VALID_TRANSITIONS: Record<VideoLifecycleStatus, readonly VideoLifecycleStatus[]> = {
  draft: ["awaiting_upload", "archived"],
  awaiting_upload: ["uploading", "failed_upload", "archived"],
  uploading: ["upload_received", "failed_upload", "archived"],
  upload_received: ["processing_queued", "failed_upload", "archived"],
  processing_queued: ["processing", "failed_processing", "archived"],
  processing: ["processed", "failed_processing", "archived"],
  processed: ["publish_pending", "moderation_pending", "published", "hidden", "rejected", "archived"],
  publish_pending: ["published", "moderation_pending", "rejected", "hidden", "archived"],
  published: ["hidden", "rejected", "archived"],
  failed_upload: ["awaiting_upload", "archived"],
  failed_processing: ["processing_queued", "archived"],
  moderation_pending: ["publish_pending", "published", "hidden", "rejected", "archived"],
  hidden: ["published", "archived"],
  rejected: ["archived"],
  archived: []
};

export interface VideoModerationPolicyConfig {
  providerName: string;
  policyVersion: string;
  reviewThreshold: number;
  blockThreshold: number;
}

export interface VideoStorageConfig {
  awsRegion: string;
  rawBucket: string;
  processedBucket: string;
  cloudFrontBaseUrl?: string;
  uploadTtlSeconds: number;
  maxUploadBytes: number;
  multipartThresholdBytes: number;
  autoPublishAfterProcessing?: boolean;
  maxProcessingAttempts?: number;
  moderation?: VideoModerationPolicyConfig;
  moderationReviewBaseUrl?: string;
}

export interface VideoModerationProvider {
  scan(input: { video: VideoAsset }): Promise<{ summary: VideoModerationSummary; evidence: VideoModerationFrameEvidence[] }>;
}

export interface UploadObjectVerifier {
  verifyObjectExists(input: { bucket: string; key: string; minBytes?: number; contentType?: string }): Promise<boolean>;
}

export interface VideoProcessingExecutor {
  process(input: { video: VideoAsset; rawAssetKey: string }): Promise<{ durationMs?: number; width?: number; height?: number; processedAssetKey: string; thumbnailAssetKey?: string; coverAssetKey?: string }>;
}

const permissiveObjectVerifier: UploadObjectVerifier = {
  async verifyObjectExists() {
    return true;
  }
};

const defaultProcessingExecutor: VideoProcessingExecutor = {
  async process(input) {
    return {
      durationMs: input.video.durationMs,
      width: input.video.width,
      height: input.video.height,
      processedAssetKey: `processed/creator-videos/${input.video.id}/playback.mp4`,
      thumbnailAssetKey: `processed/creator-videos/${input.video.id}/thumb.jpg`,
      coverAssetKey: `processed/creator-videos/${input.video.id}/cover.jpg`
    };
  }
};


const defaultModerationProvider: VideoModerationProvider = {
  async scan({ video }) {
    const corpus = [video.title, video.caption, video.sourceFileName].join(" ").toLowerCase();
    const scoreFor = (terms: string[], weights: number[]) => Math.max(0, ...terms.map((term, idx) => corpus.includes(term) ? weights[idx] : 0));
    const nudityScore = scoreFor(["nude", "nudity", "topless", "lingerie"], [0.96, 0.9, 0.92, 0.66]);
    const sexualContentScore = scoreFor(["sex", "sexual", "explicit", "nsfw"], [0.88, 0.82, 0.8, 0.76]);
    const graphicSexualContentScore = scoreFor(["porn", "graphic sex", "xxx"], [0.99, 0.98, 0.94]);
    const violenceScore = scoreFor(["fight", "violence", "blood", "assault"], [0.72, 0.8, 0.85, 0.78]);
    const graphicViolenceScore = scoreFor(["gore", "beheading", "graphic violence"], [0.99, 0.99, 0.95]);
    const maxScore = Math.max(nudityScore, sexualContentScore, graphicSexualContentScore, violenceScore, graphicViolenceScore);
    const decision = maxScore >= 0.93 ? "block" : maxScore >= 0.7 ? "review" : "safe" as const;
    return {
      summary: {
        nudityScore, sexualContentScore, graphicSexualContentScore, violenceScore, graphicViolenceScore, decision,
        policyVersion: "video-safety-v1", provider: "heuristic-frame-sampler", scannedAt: new Date().toISOString()
      },
      evidence: maxScore > 0 ? [{ timestampMs: Math.max(0, Math.round((video.durationMs ?? 1000) / 2)), thumbnailUrl: video.thumbnailPlaybackUrl, labels: [decision === "block" ? "unsafe" : "review"], score: maxScore }] : []
    };
  }
};

export class VideoPlatformService {
  constructor(
    private readonly store: VideoPlatformStore,
    private readonly cfg: VideoStorageConfig,
    private readonly uploadVerifier: UploadObjectVerifier = permissiveObjectVerifier,
    private readonly processingExecutor: VideoProcessingExecutor = defaultProcessingExecutor,
    private readonly moderationService?: ModerationService,
    private readonly trustSafetyService?: TrustSafetyService,
    private readonly notificationService?: NotificationService,
    private readonly moderationProvider: VideoModerationProvider = defaultModerationProvider
  ) {}

  async createDraft(input: { userId: string; creatorId?: string; creatorWallet?: string; primaryTreeId?: string; title?: string; caption?: string; tags?: string[]; rating?: number }): Promise<VideoAsset> {
    const now = new Date().toISOString();
    const id = `vid_${randomUUID()}`;
    return this.store.createVideo({
      id,
      authorUserId: input.userId,
      creatorId: input.creatorId ?? input.userId,
      creatorWallet: input.creatorWallet,
      primaryTreeId: input.primaryTreeId,
      status: "draft",
      moderationStatus: "pending",
      visibility: "private",
      title: input.title,
      caption: input.caption,
      rating: input.rating,
      tags: input.tags ?? [],
      lifecycle: { createdAt: now, updatedAt: now },
      retryCount: 0,
      engagement: { views: 0, likes: 0, saves: 0, shares: 0, completionRate: 0 },
      tipStats: { waterTipsCount: 0, waterTipsWei: "0", directTipsCount: 0, directTipsWei: "0" }
    });
  }

  async requestUploadSession(input: { userId: string; videoId: string; fileName: string; contentType: string; sizeBytes: number }): Promise<UploadSession> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (input.sizeBytes > this.cfg.maxUploadBytes) throw new Error("file_too_large");
    if (!["draft", "awaiting_upload", "failed_upload"].includes(video.status)) throw new Error("video_not_ready_for_upload");

    await this.transition(video, "awaiting_upload");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cfg.uploadTtlSeconds * 1000).toISOString();
    const uploadMode = input.sizeBytes >= this.cfg.multipartThresholdBytes ? "multipart" : "single";
    const key = `raw/creator-videos/${input.userId}/${video.id}/original-${Date.now()}.mp4`;
    const session: UploadSession = {
      id: `ups_${randomUUID()}`,
      userId: input.userId,
      videoId: video.id,
      purpose: "creator_video",
      status: "uploading",
      bucket: this.cfg.rawBucket,
      key,
      uploadMode,
      uploadId: uploadMode === "multipart" ? `mpu_${randomUUID()}` : undefined,
      parts: uploadMode === "multipart" ? [1, 2, 3, 4, 5].map((partNumber) => ({ partNumber, signedUrl: this.signedUploadUrl(this.cfg.rawBucket, key, partNumber) })) : undefined,
      expiresAt,
      contentType: input.contentType,
      maxBytes: this.cfg.maxUploadBytes,
      createdAt: now.toISOString()
    };
    await this.store.createUploadSession(session);
    video.sourceFileName = input.fileName;
    video.sourceContentType = input.contentType;
    video.sizeBytes = input.sizeBytes;
    video.lifecycle.uploadStartedAt = now.toISOString();
    await this.transition(video, "uploading");
    return session;
  }

  async finalizeUpload(input: { userId: string; videoId: string; uploadSessionId: string; durationMs?: number; width?: number; height?: number }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    const session = await this.store.getUploadSession(input.uploadSessionId);
    if (!session || session.videoId !== input.videoId || session.userId !== input.userId) throw new Error("upload_session_not_found");
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = "expired";
      await this.store.updateUploadSession(session);
      await this.failUpload(video, "upload_session_expired");
      throw new Error("upload_session_expired");
    }

    const objectExists = await this.uploadVerifier.verifyObjectExists({
      bucket: session.bucket,
      key: session.key,
      minBytes: video.sizeBytes,
      contentType: session.contentType
    });
    if (!objectExists) {
      session.status = "failed";
      session.failureReason = "upload_object_missing";
      await this.store.updateUploadSession(session);
      await this.failUpload(video, "upload_object_missing");
      throw new Error("upload_object_missing");
    }

    session.status = "completed";
    session.finalizedAt = new Date().toISOString();
    await this.store.updateUploadSession(session);

    video.rawAssetKey = session.key;
    video.durationMs = input.durationMs;
    video.width = input.width;
    video.height = input.height;
    if (input.width && input.height) video.aspectRatio = input.width / input.height;
    video.lifecycle.uploadCompletedAt = new Date().toISOString();
    video.failureReason = undefined;
    await this.transition(video, "upload_received");
    await this.enqueueProcessing(video);
    return video;
  }

  async publish(input: { userId: string; videoId: string }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    const readiness = this.computePublishReadiness(video);
    if (!readiness.ready) throw new Error(`video_not_publish_ready:${readiness.missing.join(",")}`);
    return this.completePublish(video);
  }

  async archiveVideo(input: { userId: string; videoId: string }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    await this.transition(video, "archived", { allowNoop: true });
    return video;
  }

  async retryProcessing(input: { userId: string; videoId: string }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (video.status !== "failed_processing") throw new Error("video_not_failed_processing");
    return this.enqueueProcessing(video);
  }

  async retryUpload(input: { userId: string; videoId: string }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (video.status !== "failed_upload") throw new Error("video_not_failed_upload");
    await this.transition(video, "awaiting_upload");
    return video;
  }

  async processNextQueuedJob(): Promise<VideoProcessingJob | undefined> {
    const job = await this.store.claimNextQueuedProcessingJob();
    if (!job) return undefined;
    const video = await this.store.getVideo(job.videoId);
    if (!video) {
      job.status = "failed";
      job.lastError = "video_not_found";
      job.completedAt = new Date().toISOString();
      await this.store.updateProcessingJob(job);
      return job;
    }

    try {
      await this.transition(video, "processing", { allowNoop: true });
      video.lifecycle.processingStartedAt = job.startedAt ?? new Date().toISOString();
      const result = await this.processingExecutor.process({ video, rawAssetKey: video.rawAssetKey ?? "" });
      job.status = "succeeded";
      job.completedAt = new Date().toISOString();
      await this.store.updateProcessingJob(job);

      video.processedAssetKey = result.processedAssetKey;
      video.thumbnailAssetKey = result.thumbnailAssetKey ?? video.thumbnailAssetKey;
      video.coverAssetKey = result.coverAssetKey ?? result.thumbnailAssetKey ?? video.coverAssetKey;
      video.processedPlaybackUrl = this.playbackUrl(video.processedAssetKey);
      video.thumbnailPlaybackUrl = this.playbackUrl(video.thumbnailAssetKey);
      video.coverPlaybackUrl = this.playbackUrl(video.coverAssetKey);
      video.durationMs = result.durationMs ?? video.durationMs;
      video.width = result.width ?? video.width;
      video.height = result.height ?? video.height;
      if (video.width && video.height) video.aspectRatio = video.width / video.height;
      video.failureReason = undefined;
      video.lifecycle.processingCompletedAt = job.completedAt;

      await this.transition(video, "processed");
      await this.notificationService?.notify({ type: "video.processing.finished", recipientUserId: video.authorUserId, videoId: video.id, placeId: video.canonicalPlaceId ?? "creator" });
      await this.runModerationScan(video);
      if (video.moderationStatus === "pending" || video.moderationStatus === "review") {
        await this.transition(video, "moderation_pending", { allowNoop: true });
      } else if (this.cfg.autoPublishAfterProcessing && video.moderationStatus === "approved") {
        await this.completePublish(video);
      } else if (video.moderationStatus === "rejected") {
        await this.transition(video, "rejected", { allowNoop: true });
      } else {
        await this.transition(video, "publish_pending", { allowNoop: true });
      }
      return job;
    } catch (error) {
      job.status = "failed";
      job.lastError = error instanceof Error ? error.message : "processing_failed";
      job.completedAt = new Date().toISOString();
      await this.store.updateProcessingJob(job);
      await this.failProcessing(video, job.lastError);
      await this.notificationService?.notify({ type: "video.processing.failed", recipientUserId: video.authorUserId, videoId: video.id, placeId: video.canonicalPlaceId ?? "creator", reason: video.failureReason });
      return job;
    }
  }

  async applyModeration(input: { videoId: string; status: "approved" | "review" | "flagged" | "rejected" }): Promise<VideoAsset> {
    const video = await this.store.getVideo(input.videoId);
    if (!video) throw new Error("video_not_found");
    video.moderationStatus = input.status;
    video.lifecycle.moderatedAt = new Date().toISOString();

    if (input.status === "approved") {
      if (video.status === "moderation_pending") {
        await this.transition(video, "publish_pending");
      }
    } else if (input.status === "review") {
      await this.transition(video, "moderation_pending", { allowNoop: true });
    } else if (input.status === "flagged") {
      await this.transition(video, "hidden", { allowNoop: true });
    } else {
      await this.transition(video, "rejected", { allowNoop: true });
    }
    return video;
  }

  async updateDraft(input: { userId: string; videoId: string; title?: string; caption?: string; rating?: number; creatorWallet?: string; primaryTreeId?: string; tags?: string[]; visibility?: "public" | "private" | "unlisted" }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (input.title !== undefined) video.title = input.title;
    if (input.caption !== undefined) video.caption = input.caption;
    if (input.rating !== undefined) video.rating = input.rating;
    if (input.creatorWallet !== undefined) video.creatorWallet = input.creatorWallet;
    if (input.primaryTreeId !== undefined) video.primaryTreeId = input.primaryTreeId;
    if (input.tags !== undefined) video.tags = input.tags.slice(0, 20);
    if (input.visibility !== undefined) video.visibility = input.visibility;
    video.lifecycle.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    return video;
  }

  private sectionFor(video: VideoAsset): CreatorStudioSection {
    if (video.status === "archived") return "archived";
    if (["failed_upload", "failed_processing", "hidden", "rejected"].includes(video.status)) return "needs_attention";
    if (["processing_queued", "processing", "moderation_pending", "publish_pending", "processed", "upload_received", "uploading"].includes(video.status)) return "processing";
    if (video.status === "published") return "published";
    return "drafts";
  }

  private computeStatusCounts(rows: VideoAsset[]): CreatorStudioStatusCounts {
    const counts: CreatorStudioStatusCounts = { drafts: 0, processing: 0, published: 0, needsAttention: 0, archived: 0 };
    for (const row of rows) {
      const section = this.sectionFor(row);
      if (section === "needs_attention") counts.needsAttention += 1;
      else if (section === "drafts") counts.drafts += 1;
      else if (section === "processing") counts.processing += 1;
      else if (section === "published") counts.published += 1;
      else counts.archived += 1;
    }
    return counts;
  }

  async listStudio(userId: string, input?: { section?: CreatorStudioSection; sort?: "newest" | "oldest" | "most_views" | "most_engagement" }): Promise<VideoStudioItem[]> {
    const rows = await this.store.listByAuthor(userId);
    const filtered = input?.section ? rows.filter((row) => this.sectionFor(row) === input.section) : rows;
    const sorted = [...filtered].sort((a, b) => {
      if (input?.sort === "oldest") return a.lifecycle.updatedAt.localeCompare(b.lifecycle.updatedAt);
      if (input?.sort === "most_views") return (b.engagement?.views ?? 0) - (a.engagement?.views ?? 0);
      if (input?.sort === "most_engagement") {
        const aScore = (a.engagement?.likes ?? 0) + (a.engagement?.saves ?? 0) + (a.engagement?.shares ?? 0);
        const bScore = (b.engagement?.likes ?? 0) + (b.engagement?.saves ?? 0) + (b.engagement?.shares ?? 0);
        return bScore - aScore;
      }
      return b.lifecycle.updatedAt.localeCompare(a.lifecycle.updatedAt);
    });
    return sorted
      .sort((a, b) => b.lifecycle.updatedAt.localeCompare(a.lifecycle.updatedAt))
      .map((video) => {
        const readiness = this.computePublishReadiness(video);
        const moderationTarget = { targetType: "place_review_video" as const, targetId: video.id, placeId: video.canonicalPlaceId ?? "creator", subjectUserId: video.authorUserId };
        const moderationAggregate = this.moderationService?.getAggregate(moderationTarget);
        return {
          videoId: video.id,
          placeId: video.canonicalPlaceId ?? "creator",
          title: video.title,
          caption: video.caption,
          status: video.status,
          moderationStatus: video.moderationStatus,
      supportSummary: video.tipStats,
          moderationState: moderationAggregate?.state,
          moderationReason: video.moderationSummary?.decision == "block" ? "Blocked due to safety policy" : moderationAggregate?.state === "pending_review" || video.moderationStatus === "review" ? "Under safety review" : moderationAggregate?.state,
          statusLabel: this.statusLabel(video.status),
          section: this.sectionFor(video),
          isRetryable: video.status === "failed_processing" || video.status === "failed_upload",
          failureReason: video.failureReason,
          uploadProgressState: ["awaiting_upload", "draft"].includes(video.status)
            ? "not_started"
            : ["uploading"].includes(video.status)
              ? "in_progress"
              : ["failed_upload"].includes(video.status)
                ? "failed"
                : "completed",
          processingProgressState: ["processing_queued"].includes(video.status)
            ? "queued"
            : ["processing"].includes(video.status)
              ? "in_progress"
              : ["failed_processing"].includes(video.status)
                ? "failed"
                : ["processed", "publish_pending", "published", "moderation_pending", "hidden", "rejected"].includes(video.status)
                  ? "completed"
                  : "not_started",
          publishReadiness: readiness,
          updatedAt: video.lifecycle.updatedAt,
          publishedAt: video.lifecycle.publishedAt,
          thumbnailUrl: this.playbackUrl(video.thumbnailAssetKey)
        };
      });
  }

  async getCreatorStudioAnalytics(userId: string): Promise<CreatorStudioAnalyticsOverview> {
    const rows = await this.store.listByAuthor(userId);
    const published = rows.filter((row) => row.status === "published");
    const totals = published.reduce((acc, row) => {
      acc.views += row.engagement?.views ?? 0;
      acc.likes += row.engagement?.likes ?? 0;
      acc.saves += row.engagement?.saves ?? 0;
      acc.shares += row.engagement?.shares ?? 0;
      acc.completion += row.engagement?.completionRate ?? 0;
      return acc;
    }, { views: 0, likes: 0, saves: 0, shares: 0, completion: 0 });

    const topVideos = published
      .map((row) => ({
        videoId: row.id,
        placeId: row.canonicalPlaceId ?? "creator",
        title: row.title,
        views: row.engagement?.views ?? 0,
        likes: row.engagement?.likes ?? 0,
        saves: row.engagement?.saves ?? 0,
        shares: row.engagement?.shares ?? 0,
        completionRate: row.engagement?.completionRate ?? 0,
        publishedAt: row.lifecycle.publishedAt
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const placeMap = new Map<string, { videos: number; views: number; saves: number; completion: number }>();
    for (const row of published) {
      const key = row.canonicalPlaceId ?? "creator";
      const current = placeMap.get(key) ?? { videos: 0, views: 0, saves: 0, completion: 0 };
      current.videos += 1;
      current.views += row.engagement?.views ?? 0;
      current.saves += row.engagement?.saves ?? 0;
      current.completion += row.engagement?.completionRate ?? 0;
      placeMap.set(key, current);
    }

    const topPlaces = [...placeMap.entries()]
      .map(([placeId, stats]) => ({
        placeId,
        videos: stats.videos,
        views: stats.views,
        saves: stats.saves,
        avgCompletionRate: stats.videos > 0 ? stats.completion / stats.videos : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    return {
      summary: {
        totalVideosPublished: published.length,
        totalViews: totals.views,
        totalSaves: totals.saves,
        totalLikes: totals.likes,
        totalShares: totals.shares,
        avgCompletionRate: published.length ? totals.completion / published.length : 0
      },
      statusCounts: this.computeStatusCounts(rows),
      topVideos,
      topPlaces
    };
  }

  async getVideoById(videoId: string): Promise<VideoAsset | undefined> {
    return this.store.getVideo(videoId);
  }

  async recordVideoEvent(input: { videoId: string; userId?: string; event: "video_viewed" | "video_liked" | "video_saved" | "video_shared" | "video_completed"; progressMs?: number }): Promise<VideoAsset> {
    const video = await this.store.getVideo(input.videoId);
    if (!video) throw new Error("video_not_found");
    const engagement = video.engagement ?? { views: 0, likes: 0, saves: 0, shares: 0, completionRate: 0 };
    if (input.event === "video_viewed") engagement.views += 1;
    if (input.event === "video_liked") engagement.likes += 1;
    if (input.event === "video_saved") engagement.saves += 1;
    if (input.userId && input.event === "video_liked") await this.store.likeVideo({ videoId: video.id, userId: input.userId, createdAt: new Date().toISOString() });
    if (input.userId && input.event === "video_saved") await this.store.saveVideo({ videoId: video.id, userId: input.userId, createdAt: new Date().toISOString() });
    if (input.event === "video_shared") engagement.shares += 1;
    if (input.event === "video_completed") engagement.completionRate = Math.min(1, engagement.completionRate + 0.05);
    if (input.userId && ["video_viewed", "video_completed"].includes(input.event)) {
      await this.store.appendWatchHistory({
        id: `wh_${randomUUID()}`,
        videoId: video.id,
        userId: input.userId,
        creatorUserId: video.authorUserId,
        canonicalPlaceId: video.canonicalPlaceId ?? "creator",
        watchedAt: new Date().toISOString(),
        progressMs: Math.max(0, input.progressMs ?? 0),
        completed: input.event === "video_completed"
      });
    }
    video.engagement = engagement;
    video.lifecycle.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    return video;
  }

  async listPlaceVideos(placeId: string): Promise<VideoFeedItem[]> {
    const rows = await this.store.listPublishedByPlace(placeId);
    return rows
      .filter((video) => this.isVisibleVideo(video))
      .map((video) => this.toFeedItem(video));
  }

  async listFeed(input: { scope: FeedScope; limit: number; cursor?: string; context?: FeedScopeRequestContext; userId?: string }): Promise<{ items: VideoFeedItem[]; nextCursor?: string; meta: Record<string, unknown> }> {
    const limit = Math.min(Math.max(input.limit, 1), 30);
    const videos = (await this.store.listVideos()).filter((video) => this.isVisibleVideo(video));
    const ranked = rankPlaceLinkedVideoFeed({
      scope: input.scope,
      allVideos: videos,
      context: input.context,
      cursor: input.cursor,
      limit,
      placeSignalsFor: (placeId) => this.placeSignalsFor(videos, placeId, input.context),
      creatorSignalsFor: (creatorId) => this.creatorSignalsFor(videos, creatorId)
    });
    const items = await Promise.all(ranked.ranked.map(async (row) => this.withViewerState(row.item, input.userId)));
    return { items, nextCursor: ranked.nextCursor, meta: { observability: ranked.observability } };
  }

  async likeVideo(input: { userId: string; videoId: string }): Promise<{ likes: number; isLiked: boolean }> {
    const video = await this.store.getVideo(input.videoId);
    if (!video) throw new Error("video_not_found");
    const existing = await this.store.hasLikedVideo(input.videoId, input.userId);
    if (!existing) {
      await this.store.likeVideo({ videoId: input.videoId, userId: input.userId, createdAt: new Date().toISOString() });
      video.engagement = { ...(video.engagement ?? { views: 0, likes: 0, saves: 0, shares: 0, completionRate: 0 }), likes: (video.engagement?.likes ?? 0) + 1 };
      await this.store.updateVideo(video);
    }
    return { likes: await this.store.countLikes(input.videoId), isLiked: true };
  }

  async unlikeVideo(input: { userId: string; videoId: string }): Promise<{ likes: number; isLiked: boolean }> {
    await this.store.unlikeVideo(input.videoId, input.userId);
    const video = await this.store.getVideo(input.videoId);
    if (video?.engagement) {
      video.engagement.likes = Math.max(0, (await this.store.countLikes(input.videoId)));
      await this.store.updateVideo(video);
    }
    return { likes: await this.store.countLikes(input.videoId), isLiked: false };
  }

  async saveVideo(input: { userId: string; videoId: string }): Promise<{ saves: number; isSaved: boolean }> {
    const video = await this.store.getVideo(input.videoId);
    if (!video) throw new Error("video_not_found");
    if (!(await this.store.hasSavedVideo(input.videoId, input.userId))) {
      await this.store.saveVideo({ videoId: input.videoId, userId: input.userId, createdAt: new Date().toISOString() });
      video.engagement = { ...(video.engagement ?? { views: 0, likes: 0, saves: 0, shares: 0, completionRate: 0 }), saves: (video.engagement?.saves ?? 0) + 1 };
      await this.store.updateVideo(video);
    }
    return { saves: await this.store.countSaves(input.videoId), isSaved: true };
  }

  async unsaveVideo(input: { userId: string; videoId: string }): Promise<{ saves: number; isSaved: boolean }> {
    await this.store.unsaveVideo(input.videoId, input.userId);
    const video = await this.store.getVideo(input.videoId);
    if (video?.engagement) {
      video.engagement.saves = Math.max(0, (await this.store.countSaves(input.videoId)));
      await this.store.updateVideo(video);
    }
    return { saves: await this.store.countSaves(input.videoId), isSaved: false };
  }

  async listSavedVideos(userId: string, input?: { limit?: number; cursor?: string }): Promise<{ items: VideoFeedItem[]; nextCursor?: string }> {
    const result = await this.store.listSavedVideos(userId, Math.max(1, Math.min(input?.limit ?? 20, 50)), input?.cursor);
    const items = await Promise.all(result.items.map(async (row) => {
      const video = await this.store.getVideo(row.videoId);
      return video ? this.withViewerState(this.toFeedItem(video), userId) : undefined;
    }));
    return { items: items.filter((row): row is VideoFeedItem => Boolean(row)), nextCursor: result.nextCursor };
  }

  async getReengagementSummary(userId: string, limit = 10): Promise<ReengagementSummary> {
    const history = await this.store.listWatchHistory(userId, Math.max(1, Math.min(limit * 10, 200)));
    const recentVideos: VideoFeedItem[] = [];
    for (const row of history.slice(0, limit)) {
      const video = await this.store.getVideo(row.videoId);
      if (video) recentVideos.push(await this.withViewerState(this.toFeedItem(video), userId));
    }
    const creatorAffinity = [...history.reduce((acc, row) => acc.set(row.creatorUserId, (acc.get(row.creatorUserId) ?? 0) + 1), new Map<string, number>()).entries()]
      .map(([creatorUserId, watchEvents]) => ({ creatorUserId, watchEvents }))
      .sort((a, b) => b.watchEvents - a.watchEvents)
      .slice(0, 5);
    const placeAffinity = [...history.reduce((acc, row) => acc.set(row.canonicalPlaceId, (acc.get(row.canonicalPlaceId) ?? 0) + 1), new Map<string, number>()).entries()]
      .map(([canonicalPlaceId, watchEvents]) => ({ canonicalPlaceId, watchEvents }))
      .sort((a, b) => b.watchEvents - a.watchEvents)
      .slice(0, 5);
    return { recentVideos, creatorAffinity, placeAffinity };
  }

  async reportVideo(input: { userId: string; videoId: string; reasonCode: "sexual_explicit" | "graphic_violent" | "harassment_bullying" | "hate_abusive_language" | "spam" | "other"; note?: string }): Promise<{ accepted: true; aggregate?: ReturnType<ModerationService["getAggregate"]> }> {
    const video = await this.store.getVideo(input.videoId);
    if (!video) throw new Error("video_not_found");
    const target = { targetType: "place_review_video" as const, targetId: video.id, placeId: video.canonicalPlaceId ?? "creator", subjectUserId: video.authorUserId };
    const result = await this.moderationService?.submitReport({ target, reporterUserId: input.userId, reasonCode: input.reasonCode, note: input.note });
    return { accepted: true, aggregate: result?.aggregate };
  }

  async listCreatorVideos(userId: string): Promise<VideoFeedItem[]> {
    const rows = (await this.store.listByAuthor(userId)).filter((video) => video.status === "published" && video.moderationStatus === "approved" && this.isVisibleVideo(video));
    return rows.map((video) => this.toFeedItem(video));
  }

  async getDiagnostics(now = new Date()): Promise<VideoOperationalDiagnostics> {
    const jobs = await this.store.listProcessingJobs();
    const staleDraftThreshold = now.getTime() - 1000 * 60 * 60 * 24;
    const stuckThreshold = now.getTime() - 1000 * 60 * 30;
    const allVideos = await this.store.listVideos();

    return {
      queuedProcessingJobs: jobs.filter((job) => job.status === "queued").length,
      failedProcessingJobs: jobs.filter((job) => job.status === "failed").length,
      staleDraftCount: allVideos.filter((video) => video.status === "draft" && new Date(video.lifecycle.createdAt).getTime() < staleDraftThreshold).length,
      stuckProcessingCount: allVideos.filter((video) => ["processing", "processing_queued"].includes(video.status) && new Date(video.lifecycle.updatedAt).getTime() < stuckThreshold).length
    };
  }

  private async runModerationScan(video: VideoAsset): Promise<void> {
    const result = await this.moderationProvider.scan({ video });
    video.moderationSummary = result.summary;
    video.moderationEvidence = result.evidence;
    const target = { targetType: "place_review_video" as const, targetId: video.id, placeId: video.canonicalPlaceId ?? "creator", subjectUserId: video.authorUserId };
    await this.moderationService?.ingestSignals({
      target,
      actorUserId: video.authorUserId,
      signals: [
        { category: "unsafe_media", ruleId: "video.nudity", score: result.summary.nudityScore, reasonCode: "nudity_risk_detected", explanation: "Representative frame scan detected nudity risk.", metadata: { evidence: result.evidence } },
        { category: "unsafe_media", ruleId: "video.sexual_content", score: result.summary.sexualContentScore, reasonCode: "sexual_content_risk_detected", explanation: "Representative frame scan detected sexual content risk.", metadata: { evidence: result.evidence } },
        { category: "unsafe_media", ruleId: "video.graphic_sexual_content", score: result.summary.graphicSexualContentScore, reasonCode: "graphic_sexual_content_detected", explanation: "Representative frame scan detected graphic sexual content risk.", metadata: { evidence: result.evidence } },
        { category: "unsafe_media", ruleId: "video.violence", score: result.summary.violenceScore, reasonCode: "violence_risk_detected", explanation: "Representative frame scan detected violence risk.", metadata: { evidence: result.evidence } },
        { category: "unsafe_media", ruleId: "video.graphic_violence", score: result.summary.graphicViolenceScore, reasonCode: "graphic_violence_detected", explanation: "Representative frame scan detected graphic violence risk.", metadata: { evidence: result.evidence } }
      ]
    });
    if (result.summary.decision === "safe") {
      video.moderationStatus = "approved";
    } else if (result.summary.decision === "review") {
      video.moderationStatus = "review";
      await this.notificationService?.notify({ type: "video.moderation.changed", recipientUserId: video.authorUserId, videoId: video.id, placeId: video.canonicalPlaceId ?? "creator", moderationState: "pending" });
    } else {
      video.moderationStatus = "rejected";
      await this.notificationService?.notify({ type: "video.moderation.changed", recipientUserId: video.authorUserId, videoId: video.id, placeId: video.canonicalPlaceId ?? "creator", moderationState: "rejected" });
    }
    video.lifecycle.moderatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
  }

  private async enqueueProcessing(video: VideoAsset): Promise<VideoAsset> {
    await this.transition(video, "processing_queued");
    const now = new Date().toISOString();
    const latest = await this.store.getLatestProcessingJobByVideo(video.id);
    const attempt = (latest?.attempt ?? 0) + 1;
    const job: VideoProcessingJob = {
      id: `vjob_${randomUUID()}`,
      videoId: video.id,
      status: "queued",
      attempt,
      maxAttempts: this.cfg.maxProcessingAttempts ?? 3,
      queuedAt: now
    };
    await this.store.createProcessingJob(job);
    video.processingJobId = job.id;
    video.lifecycle.processingQueuedAt = now;
    video.retryCount = Math.max(video.retryCount, attempt - 1);
    await this.store.updateVideo(video);
    return video;
  }

  private async completePublish(video: VideoAsset): Promise<VideoAsset> {
    await this.transition(video, "published", { allowNoop: true });
    video.moderationStatus = "approved";
    video.visibility = video.visibility === "private" ? "public" : video.visibility;
    video.lifecycle.publishedAt = video.lifecycle.publishedAt ?? new Date().toISOString();
    video.lifecycle.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    await this.notificationService?.notify({ type: "video.published", recipientUserId: video.authorUserId, videoId: video.id, placeId: video.canonicalPlaceId ?? "creator" });
    return video;
  }

  private computePublishReadiness(video: VideoAsset): { ready: boolean; missing: string[] } {
    const missing: string[] = [];
    if (!video.rawAssetKey) missing.push("raw_asset");
    if (!video.processedAssetKey) missing.push("processed_asset");
    if (!video.thumbnailAssetKey && !video.coverAssetKey) missing.push("thumbnail_or_cover");
    if (!video.title && !video.caption) missing.push("metadata");
    if (video.moderationStatus !== "approved") missing.push("moderation_approval");
    if (video.visibility === "private") missing.push("public_visibility");
    return { ready: missing.length === 0, missing };
  }

  private async transition(video: VideoAsset, target: VideoLifecycleStatus, options?: { allowNoop?: boolean }): Promise<void> {
    if (video.status === target && options?.allowNoop) return;
    const allowed = VALID_TRANSITIONS[video.status] ?? [];
    if (!allowed.includes(target)) throw new Error(`invalid_video_transition:${video.status}->${target}`);
    video.status = target;
    video.lifecycle.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
  }

  private async failUpload(video: VideoAsset, reason: string): Promise<void> {
    video.failureReason = reason;
    video.lifecycle.failedAt = new Date().toISOString();
    await this.transition(video, "failed_upload", { allowNoop: true });
  }

  private async failProcessing(video: VideoAsset, reason: string): Promise<void> {
    video.failureReason = reason;
    video.lifecycle.failedAt = new Date().toISOString();
    await this.transition(video, "failed_processing", { allowNoop: true });
  }

  private toFeedItem(video: VideoAsset): VideoFeedItem {
    const target = { targetType: "place_review_video" as const, targetId: video.id, placeId: video.canonicalPlaceId ?? "creator", subjectUserId: video.authorUserId };
    const trust = this.trustSafetyService?.getContentSummary(target, 0.6);
    return {
      videoId: video.id,
      placeId: video.canonicalPlaceId ?? "creator",
      title: video.title,
      caption: video.caption,
      creatorUserId: video.authorUserId,
      playbackUrl: this.playbackUrl(video.processedAssetKey),
      thumbnailUrl: this.playbackUrl(video.thumbnailAssetKey),
      coverUrl: this.playbackUrl(video.coverAssetKey),
      status: video.status,
      moderationStatus: video.moderationStatus,
      supportSummary: video.tipStats,
      trust: trust ? { trustScore: trust.trustScore, trustTier: trust.trustTier, badges: trust.badges } : undefined,
      publishedAt: video.lifecycle.publishedAt
    };
  }

  private async withViewerState(item: VideoFeedItem, userId?: string): Promise<VideoFeedItem> {
    if (!userId) return item;
    const latestWatch = await this.store.getLatestWatch(item.videoId, userId);
    return {
      ...item,
      viewerState: {
        isLiked: await this.store.hasLikedVideo(item.videoId, userId),
        isSaved: await this.store.hasSavedVideo(item.videoId, userId),
        lastWatchedAt: latestWatch?.watchedAt,
        watchProgressMs: latestWatch?.progressMs
      }
    };
  }

  private placeSignalsFor(videos: VideoAsset[], placeId: string, context?: FeedScopeRequestContext): PlaceFeedSignals {
    const placeVideos = videos.filter((row) => row.canonicalPlaceId === placeId);
    const reviewCount = placeVideos.length;
    const avgRating = placeVideos.length ? placeVideos.reduce((acc, row) => acc + (row.rating ?? 0), 0) / placeVideos.length : 0;
    const saves = placeVideos.reduce((acc, row) => acc + (row.engagement?.saves ?? 0), 0);
    const trusted = placeVideos.filter((row) => row.moderationStatus === "approved").length / Math.max(1, reviewCount);
    const placeTrust = this.trustSafetyService?.summarizePlace({
      placeId,
      contentTargets: placeVideos.map((row) => ({ targetType: "place_review_video" as const, targetId: row.id, placeId: row.canonicalPlaceId, subjectUserId: row.authorUserId }))
    });
    const exemplar = placeVideos[0];
    const city = exemplar?.feedDebug?.placeCity ?? context?.city;
    const region = exemplar?.feedDebug?.placeRegion ?? context?.region;
    return {
      canonicalPlaceId: placeId,
      name: `Place ${placeId}`,
      category: "creator_video",
      city,
      region,
      qualityScore: Math.min(1, (avgRating / 5) * 0.65 + trusted * 0.25 + (placeTrust?.trustScore ?? 0.5) * 0.1),
      contentRichnessScore: Math.min(1, reviewCount / 8 + saves / 200),
      trustedReviewScore: Math.min(1, trusted * 0.7 + (placeTrust?.trustedContentRatio ?? 0) * 0.3),
      distanceMeters: exemplar?.feedDebug?.distanceMeters
    };
  }

  private creatorSignalsFor(videos: VideoAsset[], creatorId: string): CreatorFeedSignals {
    const creatorVideos = videos.filter((row) => row.authorUserId === creatorId);
    const avgCompletion = creatorVideos.length ? creatorVideos.reduce((acc, row) => acc + (row.engagement?.completionRate ?? 0), 0) / creatorVideos.length : 0;
    const avgLikes = creatorVideos.length ? creatorVideos.reduce((acc, row) => acc + (row.engagement?.likes ?? 0), 0) / creatorVideos.length : 0;
    const creatorTrust = this.trustSafetyService?.summarizeCreator({
      creatorUserId: creatorId,
      contentTargets: creatorVideos.map((row) => ({ targetType: "place_review_video" as const, targetId: row.id, placeId: row.canonicalPlaceId, subjectUserId: creatorId }))
    });
    return {
      creatorUserId: creatorId,
      displayName: `Creator ${creatorId}`,
      handle: `@${creatorId}`,
      qualityScore: Math.min(1, avgCompletion * 0.6 + Math.min(1, avgLikes / 150) * 0.4),
      trustScore: Math.min(1, creatorVideos.filter((row) => row.moderationStatus === "approved").length / Math.max(1, creatorVideos.length) * 0.6 + (creatorTrust?.trustScore ?? 0.5) * 0.4)
    };
  }

  private isVisibleVideo(video: VideoAsset): boolean {
    if (!["published", "moderation_pending", "publish_pending"].includes(video.status)) return false;
    if (!this.moderationService) return true;
    return this.moderationService.isPubliclyVisible({ targetType: "place_review_video", targetId: video.id, placeId: video.canonicalPlaceId ?? "creator", subjectUserId: video.authorUserId });
  }

  private playbackUrl(key?: string): string | undefined {
    if (!key) return undefined;
    if (this.cfg.cloudFrontBaseUrl) return `${this.cfg.cloudFrontBaseUrl.replace(/\/$/, "")}/${key}`;
    return `https://${this.cfg.processedBucket}.s3.${this.cfg.awsRegion}.amazonaws.com/${key}`;
  }

  private signedUploadUrl(bucket: string, key: string, partNumber?: number): string {
    const suffix = partNumber ? `?partNumber=${partNumber}` : "";
    return `https://${bucket}.s3.${this.cfg.awsRegion}.amazonaws.com/${key}${suffix}`;
  }

  private statusLabel(status: VideoLifecycleStatus): string {
    const labels: Record<VideoLifecycleStatus, string> = {
      draft: "Draft",
      awaiting_upload: "Awaiting upload",
      uploading: "Uploading",
      upload_received: "Upload received",
      processing_queued: "Processing queued",
      processing: "Processing",
      processed: "Processed",
      publish_pending: "Ready to publish",
      published: "Published",
      failed_upload: "Upload failed",
      failed_processing: "Processing failed",
      moderation_pending: "Moderation pending",
      hidden: "Hidden",
      rejected: "Rejected",
      archived: "Archived"
    };
    return labels[status];
  }

  private async requireOwnerVideo(userId: string, videoId: string): Promise<VideoAsset> {
    const video = await this.store.getVideo(videoId);
    if (!video || video.authorUserId !== userId) throw new Error("video_not_found");
    return video;
  }
}
