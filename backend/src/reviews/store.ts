export type ModerationState = "pending" | "published" | "hidden" | "removed" | "flagged";
export type ReviewSort = "newest" | "most_helpful" | "oldest";

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
  now?: Date;
  editWindowMinutes: number;
}

export interface UpdateReviewInput {
  reviewId: string;
  actorUserId: string;
  body?: string;
  rating?: number;
  now?: Date;
  allowExpiredEdit?: boolean;
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

export interface ReviewsStore {
  listByPlace(input: ListReviewsInput): Promise<ListReviewsResult>;
  getById(reviewId: string, viewerUserId?: string, includeHidden?: boolean): Promise<PlaceReview | null>;
  getByPlaceAndAuthor(placeId: string, authorUserId: string): Promise<PlaceReview | null>;
  createOrReplace(input: CreateReviewInput): Promise<PlaceReview>;
  update(input: UpdateReviewInput): Promise<PlaceReview>;
  softDelete(reviewId: string, actorUserId: string, now?: Date): Promise<PlaceReview>;
  setModerationState(reviewId: string, state: ModerationState, reason?: string, now?: Date): Promise<PlaceReview>;
  voteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
  unvoteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
  reportReview(reviewId: string, userId: string, reason: string): Promise<void>;
  createOrUpdateBusinessReply(input: { reviewId: string; businessProfileId: string; ownerUserId: string; body: string; now?: Date }): Promise<BusinessReply>;
  deleteBusinessReply(input: { reviewId: string; replyId: string; actorUserId: string; businessProfileId: string; now?: Date }): Promise<BusinessReply>;
}
