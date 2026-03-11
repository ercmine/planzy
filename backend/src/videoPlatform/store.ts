import type { UploadSession, VideoAsset } from "./types.js";

export interface VideoPlatformStore {
  createVideo(video: VideoAsset): Promise<VideoAsset>;
  updateVideo(video: VideoAsset): Promise<VideoAsset>;
  getVideo(videoId: string): Promise<VideoAsset | undefined>;
  listByAuthor(authorUserId: string): Promise<VideoAsset[]>;
  listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]>;
  listPublishedFeed(limit: number, cursor?: string): Promise<{ items: VideoAsset[]; nextCursor?: string }>;
  createUploadSession(session: UploadSession): Promise<UploadSession>;
  getUploadSession(sessionId: string): Promise<UploadSession | undefined>;
  updateUploadSession(session: UploadSession): Promise<UploadSession>;
}

export class MemoryVideoPlatformStore implements VideoPlatformStore {
  private readonly videos = new Map<string, VideoAsset>();
  private readonly uploadSessions = new Map<string, UploadSession>();

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

  async listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]> {
    return [...this.videos.values()].filter((video) => video.canonicalPlaceId === canonicalPlaceId && video.status === "published" && video.moderationStatus === "approved");
  }

  async listPublishedFeed(limit: number, cursor?: string): Promise<{ items: VideoAsset[]; nextCursor?: string }> {
    const sorted = [...this.videos.values()]
      .filter((video) => video.status === "published" && video.moderationStatus === "approved" && video.visibility === "public")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt));

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
}
