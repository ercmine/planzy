import type { SavedVideo, UploadSession, VideoAsset, VideoLike, VideoProcessingJob, WatchHistoryEntry } from "./types.js";

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
  likeVideo(input: VideoLike): Promise<void>;
  unlikeVideo(videoId: string, userId: string): Promise<void>;
  hasLikedVideo(videoId: string, userId: string): Promise<boolean>;
  countLikes(videoId: string): Promise<number>;
  saveVideo(input: SavedVideo): Promise<void>;
  unsaveVideo(videoId: string, userId: string): Promise<void>;
  hasSavedVideo(videoId: string, userId: string): Promise<boolean>;
  countSaves(videoId: string): Promise<number>;
  listSavedVideos(userId: string, limit: number, cursor?: string): Promise<{ items: SavedVideo[]; nextCursor?: string }>;
  appendWatchHistory(entry: WatchHistoryEntry): Promise<void>;
  listWatchHistory(userId: string, limit: number): Promise<WatchHistoryEntry[]>;
  getLatestWatch(videoId: string, userId: string): Promise<WatchHistoryEntry | undefined>;
}

export class MemoryVideoPlatformStore implements VideoPlatformStore {
  private readonly videos = new Map<string, VideoAsset>();
  private readonly uploadSessions = new Map<string, UploadSession>();
  private readonly processingJobs = new Map<string, VideoProcessingJob>();
  private readonly likes = new Map<string, VideoLike>();
  private readonly saves = new Map<string, SavedVideo>();
  private readonly watchHistory = new Map<string, WatchHistoryEntry[]>();

  async createVideo(video: VideoAsset): Promise<VideoAsset> { this.videos.set(video.id, video); return video; }
  async updateVideo(video: VideoAsset): Promise<VideoAsset> { this.videos.set(video.id, video); return video; }
  async getVideo(videoId: string): Promise<VideoAsset | undefined> { return this.videos.get(videoId); }
  async listByAuthor(authorUserId: string): Promise<VideoAsset[]> { return [...this.videos.values()].filter((video) => video.authorUserId === authorUserId); }
  async listVideos(): Promise<VideoAsset[]> { return [...this.videos.values()]; }

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
    return { items, nextCursor: nextOffset < sorted.length ? String(nextOffset) : undefined };
  }

  async createUploadSession(session: UploadSession): Promise<UploadSession> { this.uploadSessions.set(session.id, session); return session; }
  async getUploadSession(sessionId: string): Promise<UploadSession | undefined> { return this.uploadSessions.get(sessionId); }
  async updateUploadSession(session: UploadSession): Promise<UploadSession> { this.uploadSessions.set(session.id, session); return session; }
  async createProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob> { this.processingJobs.set(job.id, job); return job; }
  async getProcessingJob(jobId: string): Promise<VideoProcessingJob | undefined> { return this.processingJobs.get(jobId); }

  async getLatestProcessingJobByVideo(videoId: string): Promise<VideoProcessingJob | undefined> {
    return [...this.processingJobs.values()].filter((job) => job.videoId === videoId).sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))[0];
  }

  async updateProcessingJob(job: VideoProcessingJob): Promise<VideoProcessingJob> { this.processingJobs.set(job.id, job); return job; }

  async claimNextQueuedProcessingJob(): Promise<VideoProcessingJob | undefined> {
    const next = [...this.processingJobs.values()].filter((job) => job.status === "queued").sort((a, b) => a.queuedAt.localeCompare(b.queuedAt))[0];
    if (!next) return undefined;
    const claimed = { ...next, status: "running" as const, startedAt: new Date().toISOString() };
    this.processingJobs.set(claimed.id, claimed);
    return claimed;
  }

  async listProcessingJobs(): Promise<VideoProcessingJob[]> { return [...this.processingJobs.values()]; }
  async likeVideo(input: VideoLike): Promise<void> { this.likes.set(`${input.videoId}:${input.userId}`, input); }
  async unlikeVideo(videoId: string, userId: string): Promise<void> { this.likes.delete(`${videoId}:${userId}`); }
  async hasLikedVideo(videoId: string, userId: string): Promise<boolean> { return this.likes.has(`${videoId}:${userId}`); }
  async countLikes(videoId: string): Promise<number> { return [...this.likes.values()].filter((row) => row.videoId === videoId).length; }
  async saveVideo(input: SavedVideo): Promise<void> { this.saves.set(`${input.videoId}:${input.userId}`, input); }
  async unsaveVideo(videoId: string, userId: string): Promise<void> { this.saves.delete(`${videoId}:${userId}`); }
  async hasSavedVideo(videoId: string, userId: string): Promise<boolean> { return this.saves.has(`${videoId}:${userId}`); }
  async countSaves(videoId: string): Promise<number> { return [...this.saves.values()].filter((row) => row.videoId === videoId).length; }

  async listSavedVideos(userId: string, limit: number, cursor?: string): Promise<{ items: SavedVideo[]; nextCursor?: string }> {
    const offset = cursor ? Number.parseInt(cursor, 10) || 0 : 0;
    const rows = [...this.saves.values()].filter((row) => row.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const items = rows.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return { items, nextCursor: nextOffset < rows.length ? String(nextOffset) : undefined };
  }

  async appendWatchHistory(entry: WatchHistoryEntry): Promise<void> {
    const rows = this.watchHistory.get(entry.userId) ?? [];
    rows.push(entry);
    this.watchHistory.set(entry.userId, rows.sort((a, b) => b.watchedAt.localeCompare(a.watchedAt)).slice(0, 500));
  }

  async listWatchHistory(userId: string, limit: number): Promise<WatchHistoryEntry[]> {
    return (this.watchHistory.get(userId) ?? []).slice(0, Math.max(1, Math.min(limit, 200)));
  }

  async getLatestWatch(videoId: string, userId: string): Promise<WatchHistoryEntry | undefined> {
    return (this.watchHistory.get(userId) ?? []).find((row) => row.videoId === videoId);
  }
}
