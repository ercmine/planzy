import type { SavedVideo, UploadSession, VideoAsset, VideoLike, VideoProcessingJob, WatchHistoryEntry } from "./types.js";
export interface VideoPlatformStore {
    createVideo(video: VideoAsset): Promise<VideoAsset>;
    updateVideo(video: VideoAsset): Promise<VideoAsset>;
    getVideo(videoId: string): Promise<VideoAsset | undefined>;
    listByAuthor(authorUserId: string): Promise<VideoAsset[]>;
    listVideos(): Promise<VideoAsset[]>;
    listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]>;
    listPublishedFeed(limit: number, cursor?: string): Promise<{
        items: VideoAsset[];
        nextCursor?: string;
    }>;
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
    listSavedVideos(userId: string, limit: number, cursor?: string): Promise<{
        items: SavedVideo[];
        nextCursor?: string;
    }>;
    appendWatchHistory(entry: WatchHistoryEntry): Promise<void>;
    listWatchHistory(userId: string, limit: number): Promise<WatchHistoryEntry[]>;
    getLatestWatch(videoId: string, userId: string): Promise<WatchHistoryEntry | undefined>;
}
export declare class MemoryVideoPlatformStore implements VideoPlatformStore {
    private readonly videos;
    private readonly uploadSessions;
    private readonly processingJobs;
    private readonly likes;
    private readonly saves;
    private readonly watchHistory;
    createVideo(video: VideoAsset): Promise<VideoAsset>;
    updateVideo(video: VideoAsset): Promise<VideoAsset>;
    getVideo(videoId: string): Promise<VideoAsset | undefined>;
    listByAuthor(authorUserId: string): Promise<VideoAsset[]>;
    listVideos(): Promise<VideoAsset[]>;
    listPublishedByPlace(canonicalPlaceId: string): Promise<VideoAsset[]>;
    listPublishedFeed(limit: number, cursor?: string): Promise<{
        items: VideoAsset[];
        nextCursor?: string;
    }>;
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
    listSavedVideos(userId: string, limit: number, cursor?: string): Promise<{
        items: SavedVideo[];
        nextCursor?: string;
    }>;
    appendWatchHistory(entry: WatchHistoryEntry): Promise<void>;
    listWatchHistory(userId: string, limit: number): Promise<WatchHistoryEntry[]>;
    getLatestWatch(videoId: string, userId: string): Promise<WatchHistoryEntry | undefined>;
}
