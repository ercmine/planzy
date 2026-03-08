export type ModerationState = "pending" | "published" | "hidden" | "removed" | "flagged";
export type ReviewSort = "newest" | "most_helpful" | "oldest";
export type ReviewMediaType = "photo" | "video";

export interface ReviewMedia {
  id: string;
  reviewId: string;
  mediaType: ReviewMediaType;
  storageProvider: "memory" | "s3" | "gcs";
  storageKey: string;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  checksum: string;
  caption?: string;
  altText?: string;
  displayOrder: number;
  isPrimary: boolean;
  moderationState: ModerationState;
  processingState: "upload_pending" | "uploaded" | "queued" | "processing" | "ready" | "failed";
  visibilityState: "owner_only" | "public" | "blocked";
  moderationReason?: string;
  processingErrorCode?: string;
  processingErrorMessage?: string;
  uploadedByUserId: string;
  durationMs?: number;
  playbackUrl?: string;
  posterUrl?: string;
  variants: {
    thumbnailUrl?: string;
    mediumUrl?: string;
    fullUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  removedAt?: string;
}

export interface ReviewMediaUpload {
  id: string;
  mediaType: ReviewMediaType;
  ownerUserId: string;
  storageProvider: "memory" | "s3" | "gcs";
  storageKey: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  durationMs?: number;
  checksum: string;
  processingProfile?: "review_video_v1";
  status: "pending" | "uploaded" | "attached" | "expired";
  createdAt: string;
  expiresAt: string;
  attachedReviewId?: string;
}

export interface ReviewAuthorSnapshot {
  userId?: string;
  profileType: "PERSONAL" | "CREATOR" | "BUSINESS";
  profileId: string;
  displayName: string;
  handle?: string;
  avatarUrl?: string;
  isDeleted?: boolean;
  visibility?: "PUBLIC" | "PRIVATE";
}

export interface BusinessReply {
  id: string;
  reviewId: string;
  businessProfileId: string;
  ownerUserId: string;
  body: string;
  moderationState: ModerationState;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  deletedAt?: string;
}

export interface PlaceReview {
  id: string;
  placeId: string;
  canonicalPlaceId: string;
  authorUserId: string;
  authorProfileType: "PERSONAL" | "CREATOR" | "BUSINESS";
  authorProfileId: string;
  author: ReviewAuthorSnapshot;
  body: string;
  text: string;
  rating?: number;
  moderationState: ModerationState;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  editWindowEndsAt: string;
  deletedAt?: string;
  helpfulCount: number;
  media: ReviewMedia[];
  mediaCount: number;
  businessReply?: BusinessReply;
  viewerHasHelpfulVote?: boolean;
  canEdit?: boolean;
}

export interface CreateReviewInput {
  placeId: string;
  canonicalPlaceId?: string;
  authorUserId: string;
  authorProfileType: "PERSONAL" | "CREATOR" | "BUSINESS";
  authorProfileId: string;
  authorDisplayName: string;
  body: string;
  rating?: number;
  mediaUploadIds?: string[];
  now?: Date;
  editWindowMinutes: number;
}

export interface UpdateReviewInput {
  reviewId: string;
  actorUserId: string;
  body?: string;
  rating?: number;
  attachMediaUploadIds?: string[];
  removeMediaIds?: string[];
  mediaOrder?: string[];
  primaryMediaId?: string;
  now?: Date;
  allowExpiredEdit?: boolean;
}

export interface CreateReviewMediaUploadInput {
  ownerUserId: string;
  mediaType?: ReviewMediaType;
  fileName: string;
  mimeType: string;
  base64Data?: string;
  fileSizeBytes?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  now?: Date;
}

export interface FinalizeReviewMediaUploadInput {
  uploadId: string;
  ownerUserId: string;
  fileSizeBytes?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  checksum?: string;
}

export interface ReviewMediaReport {
  mediaId: string;
  reviewId: string;
  reporterUserId: string;
  reason: string;
  createdAt: string;
}

export interface ListReviewsInput {
  placeId: string;
  viewerUserId?: string;
  includeHidden?: boolean;
  sort?: ReviewSort;
  limit?: number;
  cursor?: string;
}

export interface ListReviewsResult {
  reviews: PlaceReview[];
  nextCursor?: string;
}


export interface ListReviewsByAuthorProfileInput {
  authorProfileType: "PERSONAL" | "CREATOR" | "BUSINESS";
  authorProfileId: string;
  viewerUserId?: string;
  sort?: "latest" | "top";
  limit?: number;
}

export interface ReviewsStore {
  listByPlace(input: ListReviewsInput): Promise<ListReviewsResult>;
  listByAuthorProfile(input: ListReviewsByAuthorProfileInput): Promise<PlaceReview[]>;
  getById(reviewId: string, viewerUserId?: string, includeHidden?: boolean): Promise<PlaceReview | null>;
  getByPlaceAndAuthor(placeId: string, authorUserId: string): Promise<PlaceReview | null>;
  createOrReplace(input: CreateReviewInput): Promise<PlaceReview>;
  update(input: UpdateReviewInput): Promise<PlaceReview>;
  softDelete(reviewId: string, actorUserId: string, now?: Date): Promise<PlaceReview>;
  setModerationState(reviewId: string, state: ModerationState, reason?: string, now?: Date): Promise<PlaceReview>;
  voteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
  unvoteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
  reportReview(reviewId: string, userId: string, reason: string): Promise<void>;
  createMediaUpload(input: CreateReviewMediaUploadInput): Promise<ReviewMediaUpload>;
  finalizeMediaUpload(input: FinalizeReviewMediaUploadInput): Promise<ReviewMediaUpload>;
  getMediaUpload(uploadId: string): Promise<ReviewMediaUpload | null>;
  reportReviewMedia(mediaId: string, userId: string, reason: string): Promise<void>;
  setReviewMediaModerationState(reviewId: string, mediaId: string, state: ModerationState, reason?: string, now?: Date): Promise<ReviewMedia>;
  createOrUpdateBusinessReply(input: { reviewId: string; businessProfileId: string; ownerUserId: string; body: string; now?: Date }): Promise<BusinessReply>;
  deleteBusinessReply(input: { reviewId: string; replyId: string; actorUserId: string; businessProfileId: string; now?: Date }): Promise<BusinessReply>;
}
