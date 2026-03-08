import { randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import type {
  BusinessReply,
  CreateReviewInput,
  ListReviewsInput,
  ListReviewsResult,
  ModerationState,
  PlaceReview,
  ReviewSort,
  ReviewsStore,
  UpdateReviewInput
} from "./store.js";

type ReviewRow = PlaceReview & { moderationReason?: string };

const PUBLIC_STATES: ModerationState[] = ["published"];

function encodeCursor(item: { id: string; createdAt: string; helpfulCount: number }): string {
  return Buffer.from(JSON.stringify(item), "utf8").toString("base64url");
}
function decodeCursor(cursor?: string): { id: string; createdAt: string; helpfulCount: number } | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export class MemoryReviewsStore implements ReviewsStore {
  private readonly byId = new Map<string, ReviewRow>();
  private readonly helpfulVotes = new Map<string, Set<string>>();
  private readonly reports = new Map<string, Array<{ userId: string; reason: string; createdAt: string }>>();

  async listByPlace(input: ListReviewsInput): Promise<ListReviewsResult> {
    const sort = input.sort ?? "most_helpful";
    const cursor = decodeCursor(input.cursor);
    const limit = Math.max(1, Math.min(input.limit ?? 20, 50));

    const rows = [...this.byId.values()].filter((row) => {
      if (row.placeId !== input.placeId && row.canonicalPlaceId !== input.placeId) return false;
      if (input.includeHidden) return true;
      if (input.viewerUserId && row.authorUserId === input.viewerUserId) return row.deletedAt ? false : true;
      return PUBLIC_STATES.includes(row.moderationState) && !row.deletedAt;
    });

    rows.sort((a, b) => this.compareRows(a, b, sort));

    const startIndex = cursor ? rows.findIndex((row) => row.id === cursor.id) + 1 : 0;
    const page = rows.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);

    const reviews = page.map((row) => this.toView(row, input.viewerUserId));
    const tail = page.at(-1);
    return { reviews, nextCursor: tail ? encodeCursor({ id: tail.id, createdAt: tail.createdAt, helpfulCount: tail.helpfulCount }) : undefined };
  }

  async getById(reviewId: string, viewerUserId?: string, includeHidden = false): Promise<PlaceReview | null> {
    const row = this.byId.get(reviewId);
    if (!row) return null;
    if (!includeHidden && !PUBLIC_STATES.includes(row.moderationState) && row.authorUserId !== viewerUserId) return null;
    return this.toView(row, viewerUserId);
  }

  async getByPlaceAndAuthor(placeId: string, authorUserId: string): Promise<PlaceReview | null> {
    const row = [...this.byId.values()].find((item) => (item.placeId === placeId || item.canonicalPlaceId === placeId) && item.authorUserId === authorUserId && !item.deletedAt);
    return row ? this.toView(row, authorUserId) : null;
  }

  async createOrReplace(input: CreateReviewInput): Promise<PlaceReview> {
    const now = (input.now ?? new Date()).toISOString();
    const existing = [...this.byId.values()].find((item) => (item.placeId === input.placeId || item.canonicalPlaceId === input.placeId) && item.authorUserId === input.authorUserId && !item.deletedAt);
    if (existing) {
      existing.body = input.body;
      existing.text = input.body;
      existing.rating = input.rating;
      existing.updatedAt = now;
      existing.editedAt = now;
      existing.moderationState = "pending";
      return this.toView(existing, input.authorUserId);
    }

    const review: ReviewRow = {
      id: randomUUID(),
      placeId: input.placeId,
      canonicalPlaceId: input.canonicalPlaceId ?? input.placeId,
      authorUserId: input.authorUserId,
      authorProfileType: input.authorProfileType,
      authorProfileId: input.authorProfileId,
      author: {
        userId: input.authorUserId,
        profileType: input.authorProfileType,
        profileId: input.authorProfileId,
        displayName: input.authorDisplayName,
        visibility: "PUBLIC"
      },
      body: input.body,
      text: input.body,
      rating: input.rating,
      moderationState: "published",
      createdAt: now,
      updatedAt: now,
      editWindowEndsAt: new Date((input.now ?? new Date()).getTime() + input.editWindowMinutes * 60_000).toISOString(),
      helpfulCount: 0
    };

    this.byId.set(review.id, review);
    return this.toView(review, input.authorUserId);
  }

  async update(input: UpdateReviewInput): Promise<PlaceReview> {
    const row = this.byId.get(input.reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    const now = (input.now ?? new Date()).toISOString();
    const isOwner = row.authorUserId === input.actorUserId;
    if (!isOwner) throw new ValidationError(["cannot edit another user review"]);
    if (!input.allowExpiredEdit && Date.parse(row.editWindowEndsAt) < Date.now()) {
      throw new ValidationError(["edit window expired"]);
    }
    if (typeof input.body === "string") {
      row.body = input.body;
      row.text = input.body;
    }
    if (typeof input.rating === "number") row.rating = input.rating;
    row.updatedAt = now;
    row.editedAt = now;
    return this.toView(row, input.actorUserId);
  }

  async softDelete(reviewId: string, actorUserId: string, now = new Date()): Promise<PlaceReview> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    if (row.authorUserId !== actorUserId) throw new ValidationError(["cannot delete another user review"]);
    row.deletedAt = now.toISOString();
    row.moderationState = "removed";
    row.updatedAt = row.deletedAt;
    return this.toView(row, actorUserId);
  }

  async setModerationState(reviewId: string, state: ModerationState, reason?: string, now = new Date()): Promise<PlaceReview> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    row.moderationState = state;
    row.moderationReason = reason;
    row.updatedAt = now.toISOString();
    if (state === "removed") row.deletedAt = row.updatedAt;
    return this.toView(row);
  }

  async voteHelpful(reviewId: string, userId: string): Promise<PlaceReview> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    if (row.authorUserId === userId) throw new ValidationError(["cannot vote on your own review"]);
    const votes = this.helpfulVotes.get(reviewId) ?? new Set<string>();
    votes.add(userId);
    this.helpfulVotes.set(reviewId, votes);
    row.helpfulCount = votes.size;
    return this.toView(row, userId);
  }

  async unvoteHelpful(reviewId: string, userId: string): Promise<PlaceReview> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    const votes = this.helpfulVotes.get(reviewId) ?? new Set<string>();
    votes.delete(userId);
    this.helpfulVotes.set(reviewId, votes);
    row.helpfulCount = votes.size;
    return this.toView(row, userId);
  }

  async reportReview(reviewId: string, userId: string, reason: string): Promise<void> {
    const bucket = this.reports.get(reviewId) ?? [];
    bucket.push({ userId, reason, createdAt: new Date().toISOString() });
    this.reports.set(reviewId, bucket);
    const review = this.byId.get(reviewId);
    if (review && review.moderationState === "published") review.moderationState = "flagged";
  }

  async createOrUpdateBusinessReply(input: { reviewId: string; businessProfileId: string; ownerUserId: string; body: string; now?: Date }): Promise<BusinessReply> {
    const row = this.byId.get(input.reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    const nowIso = (input.now ?? new Date()).toISOString();
    if (row.businessReply && row.businessReply.businessProfileId === input.businessProfileId && !row.businessReply.deletedAt) {
      row.businessReply.body = input.body;
      row.businessReply.updatedAt = nowIso;
      row.businessReply.editedAt = nowIso;
      return row.businessReply;
    }
    const reply: BusinessReply = {
      id: randomUUID(),
      reviewId: input.reviewId,
      businessProfileId: input.businessProfileId,
      ownerUserId: input.ownerUserId,
      body: input.body,
      moderationState: "published",
      createdAt: nowIso,
      updatedAt: nowIso
    };
    row.businessReply = reply;
    return reply;
  }

  async deleteBusinessReply(input: { reviewId: string; replyId: string; actorUserId: string; businessProfileId: string; now?: Date }): Promise<BusinessReply> {
    const row = this.byId.get(input.reviewId);
    if (!row?.businessReply || row.businessReply.id !== input.replyId) throw new ValidationError(["business reply not found"]);
    if (row.businessReply.businessProfileId !== input.businessProfileId) throw new ValidationError(["cannot delete another business reply"]);
    row.businessReply.deletedAt = (input.now ?? new Date()).toISOString();
    row.businessReply.moderationState = "removed";
    return row.businessReply;
  }

  private toView(row: ReviewRow, viewerUserId?: string): PlaceReview {
    const votes = this.helpfulVotes.get(row.id) ?? new Set<string>();
    row.helpfulCount = votes.size;
    return {
      ...row,
      viewerHasHelpfulVote: viewerUserId ? votes.has(viewerUserId) : false,
      canEdit: viewerUserId === row.authorUserId && Date.parse(row.editWindowEndsAt) > Date.now()
    };
  }

  private compareRows(a: ReviewRow, b: ReviewRow, sort: ReviewSort): number {
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "oldest") return a.createdAt.localeCompare(b.createdAt);
    if (b.helpfulCount !== a.helpfulCount) return b.helpfulCount - a.helpfulCount;
    return b.createdAt.localeCompare(a.createdAt);
  }
}
