export type VideoStatus =
  | "draft"
  | "awaiting_upload"
  | "uploaded"
  | "processing"
  | "published"
  | "failed"
  | "hidden"
  | "rejected"
  | "archived";

export type ModerationStatus = "pending" | "approved" | "flagged" | "rejected";
export type Visibility = "public" | "unlisted" | "private";
export type UploadPurpose = "place_review_video" | "thumbnail" | "cover" | "draft_asset";

export interface VideoAsset {
  id: string;
  canonicalPlaceId: string;
  authorUserId: string;
  authorProfileId?: string;
  status: VideoStatus;
  moderationStatus: ModerationStatus;
  visibility: Visibility;
  title?: string;
  caption?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  originalAssetKey?: string;
  playbackAssetKey?: string;
  thumbnailAssetKey?: string;
  coverAssetKey?: string;
  durationMs?: number;
  aspectRatio?: number;
  width?: number;
  height?: number;
  sourceFileName?: string;
  sourceContentType?: string;
  processingError?: string;
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
  status: "pending" | "uploaded" | "expired" | "completed";
  bucket: string;
  key: string;
  uploadMode: "single" | "multipart";
  uploadId?: string;
  parts?: UploadPart[];
  expiresAt: string;
  contentType: string;
  maxBytes: number;
  createdAt: string;
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
  status: VideoStatus;
  moderationStatus: ModerationStatus;
  publishedAt?: string;
}
