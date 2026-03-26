import type { EvidencePrivacyClass, ReviewTrustDesignation, ReviewTrustSignals, ReviewVerificationSummary, ReviewerTrustProfile, ReviewerTrustStatus, TrustAuditLog, VerificationEvidence, VerificationEvidenceStatus, VerificationEvidenceType, VerificationLevel, VerificationSourceType } from "./trust.js";

export type ModerationState = "pending" | "published" | "hidden" | "removed" | "flagged";
export type ReviewSort = "newest" | "most_helpful" | "oldest" | "trusted";
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

export type BusinessReviewResponseStatus = "draft" | "pending" | "published" | "hidden" | "rejected" | "removed";
export type BusinessReviewResponseModerationActionType = "submitted_for_review" | "approved" | "rejected" | "hidden" | "removed" | "restored";

export interface BusinessReviewResponse {
  id: string;
  reviewId: string;
  placeId: string;
  businessProfileId: string;
  ownershipLinkId: string;
  authoredByUserId: string;
  content: string;
  status: BusinessReviewResponseStatus;
  moderationStatus: "pending" | "approved" | "rejected" | "hidden" | "removed";
  visibilityStatus: "draft" | "public" | "hidden" | "removed";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  hiddenAt?: string;
  removedAt?: string;
  editedAt?: string;
  lastRevisionNumber: number;
}

export interface BusinessReviewResponseRevision {
  id: string;
  businessReviewResponseId: string;
  content: string;
  revisionNumber: number;
  editedByUserId: string;
  moderationStatusSnapshot: BusinessReviewResponse["moderationStatus"];
  createdAt: string;
}

export interface BusinessReviewResponseModerationAction {
  id: string;
  businessReviewResponseId: string;
  actionType: BusinessReviewResponseModerationActionType;
  reasonCode?: string;
  notes?: string;
  actedByUserId: string;
  createdAt: string;
}

export interface BusinessReviewResponsePublicView {
  id: string;
  businessProfileId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  publishedAt?: string;
  attributionLabel: string;
  isVerifiedBusiness: boolean;
}

export interface ReviewPublicTrustSummary {
  reviewerTrustStatus: ReviewerTrustStatus;
  reviewTrustDesignation: ReviewTrustDesignation;
  verificationLevel: VerificationLevel;
  verificationLabel: string;
  isVerifiedVisit: boolean;
  trustBadges: string[];
  rankingBoostWeight: number;
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
  businessResponse?: BusinessReviewResponsePublicView;
  viewerHasHelpfulVote?: boolean;
  canEdit?: boolean;
  trust: ReviewPublicTrustSummary;
  eligibilitySnapshot?: ReviewEligibilitySnapshot;
}

export interface ReviewEligibilitySnapshot {
  reviewEligibilityVersion: string;
  entryDistanceMeters?: number;
  submitDistanceMeters?: number;
  locationAccuracyMeters?: number;
  locationTimestamp?: string;
  thresholdMeters?: number;
  verificationMode?: string;
  reasonCodeAtEntry?: string;
  reasonCodeAtSubmit?: string;
  fraudFlags?: string[];
  checkInSessionId?: string;
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
  eligibilitySnapshot?: ReviewEligibilitySnapshot;
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
  trustedOnly?: boolean;
  verifiedOnly?: boolean;
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

export interface VisitSessionInput {
  userId: string;
  placeId?: string;
  startedAt: string;
  endedAt?: string;
  confidenceScore: number;
  sourceType: "gps" | "check_in" | "media" | "partner";
  sessionStatus?: "active" | "ended" | "invalid";
  metadata?: Record<string, unknown>;
}

export interface ReviewVerificationOverrideInput {
  reviewId: string;
  actorUserId: string;
  status: "verified" | "rejected";
  reason?: string;
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
  createOrUpdateBusinessReviewResponse(input: {
    reviewId: string;
    placeId: string;
    businessProfileId: string;
    ownershipLinkId: string;
    authoredByUserId: string;
    content: string;
    moderationRequired: boolean;
    now?: Date;
  }): Promise<BusinessReviewResponse>;
  moderateBusinessReviewResponse(input: {
    responseId: string;
    action: BusinessReviewResponseModerationActionType;
    actedByUserId: string;
    reasonCode?: string;
    notes?: string;
    now?: Date;
  }): Promise<BusinessReviewResponse>;
  removeOwnBusinessReviewResponse(input: { responseId: string; actorUserId: string; businessProfileId: string; now?: Date }): Promise<BusinessReviewResponse>;
  getBusinessReviewResponseByReview(reviewId: string, includeHidden?: boolean): Promise<BusinessReviewResponse | null>;
  listBusinessReviewResponseRevisions(responseId: string): Promise<BusinessReviewResponseRevision[]>;
  listBusinessReviewResponseModerationActions(responseId: string): Promise<BusinessReviewResponseModerationAction[]>;
  listReviewsForBusinessResponseDashboard(input: { placeIds: string[]; onlyUnanswered?: boolean; limit?: number }): Promise<PlaceReview[]>;
  listBusinessReviewResponsesForModeration(input: { statuses?: BusinessReviewResponseStatus[]; placeId?: string; businessProfileId?: string; limit?: number }): Promise<BusinessReviewResponse[]>;
  listBusinessResponseEvents(): Promise<Array<{ eventType: string; responseId: string; reviewId: string; placeId: string; actorUserId: string; createdAt: string }>>;
  listBusinessResponseNotifications(): Promise<Array<{ type: string; userId: string; responseId: string; createdAt: string }>>;
  getReviewerTrustProfile(userId: string): Promise<ReviewerTrustProfile>;
  listTrustAuditLogs(userId: string): Promise<TrustAuditLog[]>;
  applyTrustOverride(input: TrustOverrideInput): Promise<ReviewerTrustProfile>;
  getReviewTrustSignals(reviewId: string): Promise<ReviewTrustSignals | null>;
  getReviewVerificationSummary(reviewId: string): Promise<ReviewVerificationSummary | null>;
  upsertVerificationEvidence(input: UpsertVerificationEvidenceInput): Promise<VerificationEvidence>;
  listEligibleEvidenceForUser(input: { userId: string; placeId: string; reviewId?: string }): Promise<VerificationEvidence[]>;
  createVisitSession(input: VisitSessionInput): Promise<{ id: string }>;
  applyReviewVerificationOverride(input: ReviewVerificationOverrideInput): Promise<ReviewVerificationSummary>;
}


export interface TrustOverrideInput {
  userId: string;
  actorUserId: string;
  status: ReviewerTrustStatus | "clear_override";
  reason?: string;
  notes?: string;
}

export interface UpsertVerificationEvidenceInput {
  userId: string;
  placeId: string;
  evidenceType: VerificationEvidenceType;
  evidenceStrength: number;
  sourceType?: VerificationSourceType;
  sourceId?: string;
  linkedReviewId?: string;
  evidenceStatus?: VerificationEvidenceStatus;
  confidenceScore?: number;
  strengthLevel?: "weak" | "medium" | "strong";
  observedAt?: string;
  startsAt?: string;
  endsAt?: string;
  expiresAt?: string;
  privacyClass?: EvidencePrivacyClass;
  metadata?: Record<string, unknown>;
}
