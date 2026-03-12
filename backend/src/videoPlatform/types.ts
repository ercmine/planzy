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
export type FeedScope = "local" | "regional" | "global";

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
  engagement?: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    completionRate: number;
  };
  processedPlaybackUrl?: string;
  thumbnailPlaybackUrl?: string;
  coverPlaybackUrl?: string;
  feedDebug?: {
    distanceMeters?: number;
    placeCity?: string;
    placeRegion?: string;
  };
}

export interface PlaceFeedSignals {
  canonicalPlaceId: string;
  name: string;
  category: string;
  city?: string;
  region?: string;
  lat?: number;
  lng?: number;
  qualityScore: number;
  contentRichnessScore: number;
  trustedReviewScore: number;
  distanceMeters?: number;
}

export interface CreatorFeedSignals {
  creatorUserId: string;
  displayName: string;
  handle: string;
  qualityScore: number;
  trustScore: number;
}

export interface FeedScopeProfile {
  localityWeight: number;
  placeQualityWeight: number;
  placeRichnessWeight: number;
  creatorQualityWeight: number;
  freshnessWeight: number;
  engagementWeight: number;
  trustWeight: number;
  diversityWeight: number;
  minCandidateCount: number;
}

export interface FeedScopeRequestContext {
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
}

export interface FeedScoreComponents {
  locality: number;
  placeQuality: number;
  placeRichness: number;
  creatorQuality: number;
  freshness: number;
  engagement: number;
  trust: number;
  diversityPenalty: number;
}

export interface RankingSignalBreakdown {
  finalScore: number;
  components: FeedScoreComponents;
}

export interface VideoFeedCursorPayload {
  offset: number;
  scope: FeedScope;
}

export interface FeedObservabilityEvent {
  scope: FeedScope;
  candidateCount: number;
  rankedCount: number;
  fallbackApplied: boolean;
  zeroResult: boolean;
  diversitySuppressions: number;
  averageComponentScores: FeedScoreComponents;
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
  placeName?: string;
  placeCategory?: string;
  regionLabel?: string;
  title?: string;
  caption?: string;
  creatorUserId: string;
  creatorSummary?: {
    creatorUserId: string;
    displayName: string;
    handle: string;
    qualityScore: number;
    trustScore: number;
    trustTier?: "low" | "developing" | "trusted" | "high";
    trustBadges?: string[];
  };
  placeSummary?: {
    canonicalPlaceId: string;
    name: string;
    category: string;
    city?: string;
    region?: string;
    distanceMeters?: number;
    qualityScore: number;
    contentRichnessScore: number;
    trustedReviewScore: number;
    trustTier?: "low" | "developing" | "trusted" | "high";
  };
  playbackUrl?: string;
  thumbnailUrl?: string;
  coverUrl?: string;
  rating?: number;
  engagementSummary?: {
    views: number;
    likes: number;
    saves: number;
    shares: number;
    completionRate: number;
  };
  scope?: FeedScope;
  ranking?: RankingSignalBreakdown;
  status: VideoLifecycleStatus;
  moderationStatus: ModerationStatus;
  trust?: {
    trustScore: number;
    trustTier: "low" | "developing" | "trusted" | "high";
    badges: string[];
  };
  publishedAt?: string;
}

export interface VideoStudioItem {
  videoId: string;
  placeId: string;
  title?: string;
  caption?: string;
  status: VideoLifecycleStatus;
  moderationStatus: ModerationStatus;
  moderationState?: "active" | "pending_review" | "auto_limited" | "hidden" | "removed" | "rejected" | "restored" | "escalated";
  moderationReason?: string;
  statusLabel: string;
  section: CreatorStudioSection;
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

export type CreatorStudioSection = "drafts" | "processing" | "published" | "needs_attention" | "archived";

export interface CreatorStudioStatusCounts {
  drafts: number;
  processing: number;
  published: number;
  needsAttention: number;
  archived: number;
}

export interface CreatorStudioVideoAnalytics {
  videoId: string;
  placeId: string;
  title?: string;
  views: number;
  likes: number;
  saves: number;
  shares: number;
  completionRate: number;
  publishedAt?: string;
}

export interface CreatorStudioPlaceAnalytics {
  placeId: string;
  videos: number;
  views: number;
  saves: number;
  avgCompletionRate: number;
}

export interface CreatorStudioAnalyticsOverview {
  summary: {
    totalVideosPublished: number;
    totalViews: number;
    totalSaves: number;
    totalLikes: number;
    totalShares: number;
    avgCompletionRate: number;
  };
  statusCounts: CreatorStudioStatusCounts;
  topVideos: CreatorStudioVideoAnalytics[];
  topPlaces: CreatorStudioPlaceAnalytics[];
}

export interface VideoOperationalDiagnostics {
  queuedProcessingJobs: number;
  failedProcessingJobs: number;
  staleDraftCount: number;
  stuckProcessingCount: number;
}
