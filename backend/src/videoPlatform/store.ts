import type { UploadSession, VideoAsset, VideoProcessingJob } from "./types.js";

export interface VideoPlatformStore {
  createVideo(video: VideoAsset): Promise<VideoAsset>;
  updateVideo(video: VideoAsset): Promise<VideoAsset>;
  getVideo(videoId: string): Promise<VideoAsset | undefined>;
  listByAuthor(authorUserId: string): Promise<VideoAsset[]>;
  listVideos(): Promise<VideoAsset[]>;
  listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]>;
  listPublishedFeed(limit: number, cursor?: string): Promise<{ items: VideoAsset[]; nextCursor?: string }>;
  createUploadSession(session: UploadSession): Promise<UploadSession>;
  getUploadSession(sessionId: string): Promise<UploadSession | undefined>;
  updateUploadSession(session: UploadSession): Promise<UploadSession>;
  createProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob>;
  getProcessingJob(jobId: string): Promise<VideoProcessingJob | undefined>;
  getLatestProcessingJobByVideo(videoId: string): Promise<VideoProcessingJob | undefined>;
  updateProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob>;
  claimNextQueuedProcessingJob(): Promise<VideoProcessingJob | undefined>;
  listProcessingJobs(): Promise<VideoProcessingJob[]>;
}

export class MemoryVideoPlatformStore implements VideoPlatformStore {
  private readonly videos = new Map<string, VideoAsset>();
  private readonly uploadSessions = new Map<string, UploadSession>();
  private readonly processingJobs = new Map<string, VideoProcessingJob>();

  async createVideo(video: VideoAsset): Promise<VideoAsset> {
    this.videos.set(video.id, video);
    return video;
  }

  async updateVideo(video: VideoAsset): Promise<VideoAsset> {
    this.videos.set(video.id, video);
    return video;
  }

  async getVideo(videoId: string): Promise<VideoAsset | undefined> {
    return this.videos.get(videoId);
  }

  async listByAuthor(authorUserId: string): Promise<VideoAsset[]> {
    return [...this.videos.values()].filter((video) => video.authorUserId === authorUserId);
  }

  async listVideos(): Promise<VideoAsset[]> {
    return [...this.videos.values()];
  }

  async listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]> {
    return [...this.videos.values()].filter((video) => video.canonicalPlaceId === canonicalPlaceId && video.status === "published" && video.moderationStatus === "approved");
  }

  async listPublishedFeed(limit: number, cursor?: string): Promise<{ items: VideoAsset[]; nextCursor?: string }> {
    const sorted = [...this.videos.values()]
      .filter((video) => video.status === "published" && video.moderationStatus === "approved" && video.visibility === "public")
      .sort((a, b) => (b.lifecycle.publishedAt ?? b.lifecycle.createdAt).localeCompare(a.lifecycle.publishedAt ?? a.lifecycle.createdAt));

    const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const items = sorted.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
      items,
      nextCursor: nextOffset < sorted.length ? String(nextOffset) : undefined
    };
  }

  async createUploadSession(session: UploadSession): Promise<UploadSession> {
    this.uploadSessions.set(session.id, session);
    return session;
  }

  async getUploadSession(sessionId: string): Promise<UploadSession | undefined> {
    return this.uploadSessions.get(sessionId);
  }

  async updateUploadSession(session: UploadSession): Promise<UploadSession> {
    this.uploadSessions.set(session.id, session);
    return session;
  }

  async createProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob> {
    this.processingJobs.set(job.id, job);
    return job;
  }

  async getProcessingJob(jobId: string): Promise<VideoProcessingJob | undefined> {
    return this.processingJobs.get(jobId);
  }

  async getLatestProcessingJobByVideo(videoId: string): Promise<VideoProcessingJob | undefined> {
    return [...this.processingJobs.values()]
      .filter((job) => job.videoId === videoId)
      .sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))[0];
  }

  async updateProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob> {
    this.processingJobs.set(job.id, job);
    return job;
  }

  async claimNextQueuedProcessingJob(): Promise<VideoProcessingJob | undefined> {
    const next = [...this.processingJobs.values()]
      .filter((job) => job.status === "queued")
      .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0];
    if (!next) return undefined;
    const claimed = { ...next, status: "running" as const, startedAt: new Date().toISOString() };
    this.processingJobs.set(claimed.id, claimed);
    return claimed;
  }

  async listProcessingJobs(): Promise<VideoProcessingJob[]> {
    return [...this.processingJobs.values()];
  }
}
