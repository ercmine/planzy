export type VideoLifecycleStatus =
  | "draft"
  | "awaiting_upload"
  | "uploading"
  | "upload_received"
  | "processing_queued"
  | "processing"
  | "processed"
  | "publish_pending"
  | "published"
  | "failed_upload"
  | "failed_processing"
  | "moderation_pending"
  | "hidden"
  | "rejected"
  | "archived";

export type ModerationStatus = "pending" | "approved" | "flagged" | "rejected";
export type Visibility = "public" | "unlisted" | "private";
export type UploadPurpose = "place_review_video" | "thumbnail" | "cover" | "draft_asset";

export interface VideoLifecycleTimestamps {
  createdAt: string;
  uploadStartedAt?: string;
  uploadCompletedAt?: string;
  processingQueuedAt?: string;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  publishedAt?: string;
  failedAt?: string;
  moderatedAt?: string;
  updatedAt: string;
}

export interface VideoAsset {
  id: string;
  canonicalPlaceId: string;
  authorUserId: string;
  authorProfileId?: string;
  status: VideoLifecycleStatus;
  moderationStatus: ModerationStatus;
  visibility: Visibility;
  title?: string;
  caption?: string;
  rating?: number;
  lifecycle: VideoLifecycleTimestamps;
  rawAssetKey?: string;
  processedAssetKey?: string;
  thumbnailAssetKey?: string;
  coverAssetKey?: string;
  durationMs?: number;
  sizeBytes?: number;
  aspectRatio?: number;
  width?: number;
  height?: number;
  sourceFileName?: string;
  sourceContentType?: string;
  failureReason?: string;
  processingJobId?: string;
  retryCount: number;
}

export interface UploadPart {
  partNumber: number;
  signedUrl: string;
}

export interface UploadSession {
  id: string;
  userId: string;
  videoId: string;
  purpose: UploadPurpose;
  status: "pending" | "uploading" | "uploaded" | "expired" | "completed" | "failed";
  bucket: string;
  key: string;
  uploadMode: "single" | "multipart";
  uploadId?: string;
  parts?: UploadPart[];
  expiresAt: string;
  contentType: string;
  maxBytes: number;
  createdAt: string;
  finalizedAt?: string;
  failureReason?: string;
}

export type ProcessingJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface VideoProcessingJob {
  id: string;
  videoId: string;
  status: ProcessingJobStatus;
  attempt: number;
  maxAttempts: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  lastError?: string;
}

export interface VideoFeedItem {
  videoId: string;
  placeId: string;
  title?: string;
  caption?: string;
  creatorUserId: string;
  playbackUrl?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  status: VideoLifecycleStatus;
  moderationStatus: ModerationStatus;
  publishedAt?: string;
}

export interface VideoStudioItem {
  videoId: string;
  placeId: string;
  title?: string;
  caption?: string;
  status: VideoLifecycleStatus;
  moderationStatus: ModerationStatus;
  statusLabel: string;
  isRetryable: boolean;
  failureReason?: string;
  uploadProgressState: "not_started" | "in_progress" | "completed" | "failed";
  processingProgressState: "not_started" | "queued" | "in_progress" | "completed" | "failed";
  publishReadiness: {
    ready: boolean;
    missing: string[];
  };
  updatedAt: string;
  publishedAt?: string;
  thumbnailUrl?: string;
}

export interface VideoOperationalDiagnostics {
  queuedProcessingJobs: number;
  failedProcessingJobs: number;
  staleDraftCount: number;
  stuckProcessingCount: number;
}
