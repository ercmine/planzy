import { randomUUID } from "node:crypto";

import type { VideoStatus, UploadSession, VideoAsset, VideoFeedItem } from "./types.js";
import type { VideoPlatformStore } from "./store.js";

export interface VideoStorageConfig {
  awsRegion: string;
  rawBucket: string;
  processedBucket: string;
  cloudFrontBaseUrl?: string;
  uploadTtlSeconds: number;
  maxUploadBytes: number;
  multipartThresholdBytes: number;
}

export interface PlaceLookup {
  exists(placeId: string): boolean;
}

export class VideoPlatformService {
  constructor(
    private readonly store: VideoPlatformStore,
    private readonly placeLookup: PlaceLookup,
    private readonly cfg: VideoStorageConfig
  ) {}

  async createDraft(input: { userId: string; canonicalPlaceId: string; title?: string; caption?: string; rating?: number }): Promise<VideoAsset> {
    if (!this.placeLookup.exists(input.canonicalPlaceId)) {
      throw new Error("canonical_place_not_found");
    }
    const now = new Date().toISOString();
    const id = `vid_${randomUUID()}`;
    return this.store.createVideo({
      id,
      canonicalPlaceId: input.canonicalPlaceId,
      authorUserId: input.userId,
      status: "draft",
      moderationStatus: "pending",
      visibility: "public",
      title: input.title,
      caption: input.caption,
      rating: input.rating,
      createdAt: now,
      updatedAt: now
    });
  }

  async requestUploadSession(input: { userId: string; videoId: string; fileName: string; contentType: string; sizeBytes: number }): Promise<UploadSession> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (input.sizeBytes > this.cfg.maxUploadBytes) {
      throw new Error("file_too_large");
    }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.cfg.uploadTtlSeconds * 1000).toISOString();
    const uploadMode = input.sizeBytes >= this.cfg.multipartThresholdBytes ? "multipart" : "single";
    const key = `raw/place-review-videos/${input.userId}/${video.id}/original-${Date.now()}.mp4`;
    const session: UploadSession = {
      id: `ups_${randomUUID()}`,
      userId: input.userId,
      videoId: video.id,
      purpose: "place_review_video",
      status: "pending",
      bucket: this.cfg.rawBucket,
      key,
      uploadMode,
      uploadId: uploadMode === "multipart" ? `mpu_${randomUUID()}` : undefined,
      parts: uploadMode === "multipart"
        ? [1, 2, 3, 4, 5].map((partNumber) => ({ partNumber, signedUrl: this.signedUploadUrl(this.cfg.rawBucket, key, partNumber) }))
        : undefined,
      expiresAt,
      contentType: input.contentType,
      maxBytes: this.cfg.maxUploadBytes,
      createdAt: now.toISOString()
    };
    await this.store.createUploadSession(session);
    video.status = "awaiting_upload";
    video.sourceFileName = input.fileName;
    video.sourceContentType = input.contentType;
    video.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    return session;
  }

  async finalizeUpload(input: { userId: string; videoId: string; uploadSessionId: string; durationMs?: number; width?: number; height?: number }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    const session = await this.store.getUploadSession(input.uploadSessionId);
    if (!session || session.videoId !== input.videoId || session.userId !== input.userId) {
      throw new Error("upload_session_not_found");
    }
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      session.status = "expired";
      await this.store.updateUploadSession(session);
      throw new Error("upload_session_expired");
    }
    session.status = "uploaded";
    await this.store.updateUploadSession(session);
    video.originalAssetKey = session.key;
    video.durationMs = input.durationMs;
    video.width = input.width;
    video.height = input.height;
    if (input.width && input.height) {
      video.aspectRatio = input.width / input.height;
    }
    video.status = "uploaded";
    video.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    return video;
  }

  async publish(input: { userId: string; videoId: string }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (!video.originalAssetKey) {
      throw new Error("video_upload_required");
    }
    const updated = new Date().toISOString();
    video.playbackAssetKey = `processed/place-review-videos/${video.id}/playback.mp4`;
    video.thumbnailAssetKey = `processed/place-review-videos/${video.id}/thumb.jpg`;
    video.coverAssetKey = `processed/place-review-videos/${video.id}/cover.jpg`;
    video.status = "processing";
    video.updatedAt = updated;
    await this.store.updateVideo(video);

    video.status = "published";
    video.moderationStatus = "approved";
    video.publishedAt = new Date().toISOString();
    video.updatedAt = video.publishedAt;
    await this.store.updateVideo(video);
    return video;
  }

  async updateDraft(input: { userId: string; videoId: string; title?: string; caption?: string; rating?: number; canonicalPlaceId?: string; status?: VideoStatus }): Promise<VideoAsset> {
    const video = await this.requireOwnerVideo(input.userId, input.videoId);
    if (input.canonicalPlaceId && !this.placeLookup.exists(input.canonicalPlaceId)) {
      throw new Error("canonical_place_not_found");
    }
    if (input.canonicalPlaceId) video.canonicalPlaceId = input.canonicalPlaceId;
    if (input.title !== undefined) video.title = input.title;
    if (input.caption !== undefined) video.caption = input.caption;
    if (input.rating !== undefined) video.rating = input.rating;
    if (input.status) video.status = input.status;
    video.updatedAt = new Date().toISOString();
    await this.store.updateVideo(video);
    return video;
  }

  async listStudio(userId: string): Promise<VideoAsset[]> {
    const rows = await this.store.listByAuthor(userId);
    return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async listPlaceVideos(placeId: string): Promise<VideoFeedItem[]> {
    const rows = await this.store.listPublishedByPlace(placeId);
    return rows.map((video) => this.toFeedItem(video));
  }

  async listFeed(input: { limit: number; cursor?: string }): Promise<{ items: VideoFeedItem[]; nextCursor?: string }> {
    const rows = await this.store.listPublishedFeed(Math.min(Math.max(input.limit, 1), 30), input.cursor);
    return { items: rows.items.map((video) => this.toFeedItem(video)), nextCursor: rows.nextCursor };
  }

  async listCreatorVideos(userId: string): Promise<VideoFeedItem[]> {
    const rows = (await this.store.listByAuthor(userId)).filter((video) => video.status === "published");
    return rows.map((video) => this.toFeedItem(video));
  }

  private toFeedItem(video: VideoAsset): VideoFeedItem {
    return {
      videoId: video.id,
      placeId: video.canonicalPlaceId,
      title: video.title,
      caption: video.caption,
      creatorUserId: video.authorUserId,
      playbackUrl: this.playbackUrl(video.playbackAssetKey),
      thumbnailUrl: this.playbackUrl(video.thumbnailAssetKey),
      coverUrl: this.playbackUrl(video.coverAssetKey),
      status: video.status,
      moderationStatus: video.moderationStatus,
      publishedAt: video.publishedAt
    };
  }

  private playbackUrl(key?: string): string | undefined {
    if (!key) return undefined;
    if (this.cfg.cloudFrontBaseUrl) {
      return `${this.cfg.cloudFrontBaseUrl.replace(/\/$/, "")}/${key}`;
    }
    return `https://${this.cfg.processedBucket}.s3.${this.cfg.awsRegion}.amazonaws.com/${key}`;
  }

  private signedUploadUrl(bucket: string, key: string, partNumber?: number): string {
    const suffix = partNumber ? `?partNumber=${partNumber}` : "";
    return `https://${bucket}.s3.${this.cfg.awsRegion}.amazonaws.com/${key}${suffix}`;
  }

  private async requireOwnerVideo(userId: string, videoId: string): Promise<VideoAsset> {
    const video = await this.store.getVideo(videoId);
    if (!video || video.authorUserId !== userId) {
      throw new Error("video_not_found");
    }
    return video;
  }
}
