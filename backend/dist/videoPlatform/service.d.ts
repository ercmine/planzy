import type { UploadSession, VideoAsset, VideoFeedItem, VideoOperationalDiagnostics, VideoProcessingJob, VideoStudioItem, CreatorStudioAnalyticsOverview, CreatorStudioSection, FeedScope, FeedScopeRequestContext, ReengagementSummary, VideoModerationSummary, VideoModerationFrameEvidence } from "./types.js";
import type { VideoPlatformStore } from "./store.js";
import type { ModerationService } from "../moderation/service.js";
import { TrustSafetyService } from "../trustSafety/service.js";
import type { NotificationService } from "../notifications/service.js";
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
    scan(input: {
        video: VideoAsset;
    }): Promise<{
        summary: VideoModerationSummary;
        evidence: VideoModerationFrameEvidence[];
    }>;
}
export interface UploadObjectVerifier {
    verifyObjectExists(input: {
        bucket: string;
        key: string;
        minBytes?: number;
        contentType?: string;
    }): Promise<boolean>;
}
export interface VideoProcessingExecutor {
    process(input: {
        video: VideoAsset;
        rawAssetKey: string;
    }): Promise<{
        durationMs?: number;
        width?: number;
        height?: number;
        processedAssetKey: string;
        thumbnailAssetKey?: string;
        coverAssetKey?: string;
    }>;
}
export declare class VideoPlatformService {
    private readonly store;
    private readonly cfg;
    private readonly uploadVerifier;
    private readonly processingExecutor;
    private readonly moderationService?;
    private readonly trustSafetyService?;
    private readonly notificationService?;
    private readonly moderationProvider;
    constructor(store: VideoPlatformStore, cfg: VideoStorageConfig, uploadVerifier?: UploadObjectVerifier, processingExecutor?: VideoProcessingExecutor, moderationService?: ModerationService | undefined, trustSafetyService?: TrustSafetyService | undefined, notificationService?: NotificationService | undefined, moderationProvider?: VideoModerationProvider);
    createDraft(input: {
        userId: string;
        creatorId?: string;
        creatorWallet?: string;
        primaryTreeId?: string;
        title?: string;
        caption?: string;
        tags?: string[];
        rating?: number;
    }): Promise<VideoAsset>;
    requestUploadSession(input: {
        userId: string;
        videoId: string;
        fileName: string;
        contentType: string;
        sizeBytes: number;
    }): Promise<UploadSession>;
    finalizeUpload(input: {
        userId: string;
        videoId: string;
        uploadSessionId: string;
        durationMs?: number;
        width?: number;
        height?: number;
    }): Promise<VideoAsset>;
    publish(input: {
        userId: string;
        videoId: string;
    }): Promise<VideoAsset>;
    archiveVideo(input: {
        userId: string;
        videoId: string;
    }): Promise<VideoAsset>;
    retryProcessing(input: {
        userId: string;
        videoId: string;
    }): Promise<VideoAsset>;
    retryUpload(input: {
        userId: string;
        videoId: string;
    }): Promise<VideoAsset>;
    processNextQueuedJob(): Promise<VideoProcessingJob | undefined>;
    applyModeration(input: {
        videoId: string;
        status: "approved" | "review" | "flagged" | "rejected";
    }): Promise<VideoAsset>;
    updateDraft(input: {
        userId: string;
        videoId: string;
        title?: string;
        caption?: string;
        rating?: number;
        creatorWallet?: string;
        primaryTreeId?: string;
        tags?: string[];
        visibility?: "public" | "private" | "unlisted";
    }): Promise<VideoAsset>;
    private sectionFor;
    private computeStatusCounts;
    listStudio(userId: string, input?: {
        section?: CreatorStudioSection;
        sort?: "newest" | "oldest" | "most_views" | "most_engagement";
    }): Promise<VideoStudioItem[]>;
    getCreatorStudioAnalytics(userId: string): Promise<CreatorStudioAnalyticsOverview>;
    getVideoById(videoId: string): Promise<VideoAsset | undefined>;
    recordVideoEvent(input: {
        videoId: string;
        userId?: string;
        event: "video_viewed" | "video_liked" | "video_saved" | "video_shared" | "video_completed";
        progressMs?: number;
    }): Promise<VideoAsset>;
    listPlaceVideos(placeId: string): Promise<VideoFeedItem[]>;
    listFeed(input: {
        scope: FeedScope;
        limit: number;
        cursor?: string;
        context?: FeedScopeRequestContext;
        userId?: string;
    }): Promise<{
        items: VideoFeedItem[];
        nextCursor?: string;
        meta: Record<string, unknown>;
    }>;
    likeVideo(input: {
        userId: string;
        videoId: string;
    }): Promise<{
        likes: number;
        isLiked: boolean;
    }>;
    unlikeVideo(input: {
        userId: string;
        videoId: string;
    }): Promise<{
        likes: number;
        isLiked: boolean;
    }>;
    saveVideo(input: {
        userId: string;
        videoId: string;
    }): Promise<{
        saves: number;
        isSaved: boolean;
    }>;
    unsaveVideo(input: {
        userId: string;
        videoId: string;
    }): Promise<{
        saves: number;
        isSaved: boolean;
    }>;
    listSavedVideos(userId: string, input?: {
        limit?: number;
        cursor?: string;
    }): Promise<{
        items: VideoFeedItem[];
        nextCursor?: string;
    }>;
    getReengagementSummary(userId: string, limit?: number): Promise<ReengagementSummary>;
    reportVideo(input: {
        userId: string;
        videoId: string;
        reasonCode: "sexual_explicit" | "graphic_violent" | "harassment_bullying" | "hate_abusive_language" | "spam" | "other";
        note?: string;
    }): Promise<{
        accepted: true;
        aggregate?: ReturnType<ModerationService["getAggregate"]>;
    }>;
    listCreatorVideos(userId: string): Promise<VideoFeedItem[]>;
    getDiagnostics(now?: Date): Promise<VideoOperationalDiagnostics>;
    private runModerationScan;
    private enqueueProcessing;
    private completePublish;
    private computePublishReadiness;
    private transition;
    private failUpload;
    private failProcessing;
    private toFeedItem;
    private withViewerState;
    private placeSignalsFor;
    private creatorSignalsFor;
    private isVisibleVideo;
    private playbackUrl;
    private signedUploadUrl;
    private statusLabel;
    private requireOwnerVideo;
}
