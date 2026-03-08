import { createHash, randomUUID } from "node:crypto";

import { ValidationError } from "../plans/errors.js";
import type {
  BusinessReply,
  CreateReviewInput,
  CreateReviewMediaUploadInput,
  ListReviewsByAuthorProfileInput,
  ListReviewsInput,
  ListReviewsResult,
  ModerationState,
  PlaceReview,
  ReviewMedia,
  ReviewMediaReport,
  ReviewMediaUpload,
  ReviewSort,
  ReviewsStore,
  UpdateReviewInput
} from "./store.js";

type ReviewRow = PlaceReview & { moderationReason?: string };

const PUBLIC_STATES: ModerationState[] = ["published"];
const PUBLIC_MEDIA_MIME = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime", "video/webm"]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const MAX_PHOTOS_PER_REVIEW = 6;
const MAX_VIDEOS_PER_REVIEW = 2;
const MAX_VIDEO_BYTES = 256 * 1024 * 1024;
const MAX_VIDEO_DURATION_MS = 180_000;
const UPLOAD_TTL_MS = 15 * 60_000;

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

function normalizeMediaOrdering(media: ReviewMedia[]): ReviewMedia[] {
  const sorted = [...media].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
    return a.createdAt.localeCompare(b.createdAt);
  });
  return sorted.map((item, index) => ({ ...item, displayOrder: index, isPrimary: index === 0 }));
}

function decodeImageDimensions(buffer: Buffer, mimeType: string): { width: number; height: number } {
  if (mimeType === "image/png") {
    if (buffer.length < 24 || buffer.toString("hex", 0, 8) !== "89504e470d0a1a0a") {
      throw new ValidationError(["invalid png data"]);
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (mimeType === "image/jpeg") {
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) throw new ValidationError(["invalid jpeg data"]);
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const size = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      offset += 2 + size;
    }
    throw new ValidationError(["jpeg size metadata missing"]);
  }

  if (mimeType === "image/webp") {
    if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
      throw new ValidationError(["invalid webp data"]);
    }
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height };
    }
    throw new ValidationError(["unsupported webp encoding"]);
  }

  throw new ValidationError(["unsupported mime type"]);
}

export class MemoryReviewsStore implements ReviewsStore {
  private readonly byId = new Map<string, ReviewRow>();
  private readonly helpfulVotes = new Map<string, Set<string>>();
  private readonly reports = new Map<string, Array<{ userId: string; reason: string; createdAt: string }>>();
  private readonly mediaUploadsById = new Map<string, ReviewMediaUpload>();
  private readonly mediaReports: ReviewMediaReport[] = [];

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

  async listByAuthorProfile(input: ListReviewsByAuthorProfileInput): Promise<PlaceReview[]> {
    const rows = [...this.byId.values()].filter((row) => {
      if (row.authorProfileType !== input.authorProfileType || row.authorProfileId !== input.authorProfileId) return false;
      if (input.viewerUserId && row.authorUserId === input.viewerUserId) return !row.deletedAt;
      return PUBLIC_STATES.includes(row.moderationState) && !row.deletedAt;
    });

    rows.sort((a, b) => {
      if (input.sort === "top") {
        if (a.helpfulCount !== b.helpfulCount) return b.helpfulCount - a.helpfulCount;
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return rows.slice(0, Math.max(1, Math.min(input.limit ?? 20, 50))).map((row) => this.toView(row, input.viewerUserId));
  }

  async createOrReplace(input: CreateReviewInput): Promise<PlaceReview> {
    const nowDate = input.now ?? new Date();
    const now = nowDate.toISOString();
    const existing = [...this.byId.values()].find((item) => (item.placeId === input.placeId || item.canonicalPlaceId === input.placeId) && item.authorUserId === input.authorUserId && !item.deletedAt);
    if (existing) {
      existing.body = input.body;
      existing.text = input.body;
      existing.rating = input.rating;
      existing.updatedAt = now;
      existing.editedAt = now;
      existing.moderationState = "pending";
      if (input.mediaUploadIds?.length) {
        existing.media = this.attachUploadsToReview(existing, input.authorUserId, input.mediaUploadIds, nowDate);
        existing.mediaCount = existing.media.length;
      }
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
      editWindowEndsAt: new Date(nowDate.getTime() + input.editWindowMinutes * 60_000).toISOString(),
      helpfulCount: 0,
      media: [],
      mediaCount: 0
    };

    if (input.mediaUploadIds?.length) {
      review.media = this.attachUploadsToReview(review, input.authorUserId, input.mediaUploadIds, nowDate);
      review.mediaCount = review.media.length;
    }

    this.byId.set(review.id, review);
    return this.toView(review, input.authorUserId);
  }

  async update(input: UpdateReviewInput): Promise<PlaceReview> {
    const row = this.byId.get(input.reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    const nowDate = input.now ?? new Date();
    const now = nowDate.toISOString();
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

    if (input.removeMediaIds?.length) {
      row.media = row.media.map((item) => input.removeMediaIds?.includes(item.id)
        ? { ...item, moderationState: "removed", removedAt: now, updatedAt: now, isPrimary: false }
        : item);
    }
    if (input.attachMediaUploadIds?.length) {
      row.media = [...row.media, ...this.attachUploadsToReview(row, input.actorUserId, input.attachMediaUploadIds, nowDate, true)];
    }
    if (input.mediaOrder?.length) {
      const orderMap = new Map(input.mediaOrder.map((id, idx) => [id, idx]));
      row.media = row.media.map((item) => ({ ...item, displayOrder: orderMap.get(item.id) ?? item.displayOrder }));
    }
    if (input.primaryMediaId) {
      row.media = row.media.map((item) => ({ ...item, isPrimary: item.id === input.primaryMediaId }));
    }

    row.media = normalizeMediaOrdering(row.media.filter((item) => item.moderationState !== "removed" || item.removedAt == null));
    row.mediaCount = row.media.length;
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
    row.media = row.media.map((item) => ({ ...item, moderationState: "removed", removedAt: row.deletedAt, updatedAt: row.deletedAt! }));
    row.mediaCount = 0;
    return this.toView(row, actorUserId);
  }

  async setModerationState(reviewId: string, state: ModerationState, reason?: string, now = new Date()): Promise<PlaceReview> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    row.moderationState = state;
    row.moderationReason = reason;
    row.updatedAt = now.toISOString();
    if (state === "removed") {
      row.deletedAt = row.updatedAt;
      row.media = row.media.map((item) => ({ ...item, moderationState: "removed", removedAt: row.updatedAt, updatedAt: row.updatedAt }));
      row.mediaCount = 0;
    }
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

  async createMediaUpload(input: CreateReviewMediaUploadInput): Promise<ReviewMediaUpload> {
    const nowDate = input.now ?? new Date();
    const mediaType = input.mediaType ?? (input.mimeType.startsWith("video/") ? "video" : "photo");
    if (!PUBLIC_MEDIA_MIME.has(input.mimeType)) throw new ValidationError(["unsupported mime type"]);

    let fileSizeBytes = Number(input.fileSizeBytes ?? 0);
    let width = Number(input.width ?? 0);
    let height = Number(input.height ?? 0);
    let durationMs = Number(input.durationMs ?? 0) || undefined;
    let checksum = "";
    let status: ReviewMediaUpload["status"] = "pending";

    if (mediaType === "photo") {
      const buffer = Buffer.from(input.base64Data ?? "", "base64");
      if (!buffer.byteLength) throw new ValidationError(["upload cannot be empty"]);
      if (buffer.byteLength > MAX_PHOTO_BYTES) throw new ValidationError(["file too large"]);
      const dimensions = decodeImageDimensions(buffer, input.mimeType);
      if (dimensions.width <= 0 || dimensions.height <= 0) throw new ValidationError(["invalid image dimensions"]);
      checksum = createHash("sha256").update(buffer).digest("hex");
      fileSizeBytes = buffer.byteLength;
      width = dimensions.width;
      height = dimensions.height;
      status = "uploaded";
    } else {
      if (!input.mimeType.startsWith("video/")) throw new ValidationError(["video mime type required"]);
      if (fileSizeBytes <= 0 || fileSizeBytes > MAX_VIDEO_BYTES) throw new ValidationError(["invalid video file size"]);
      if (durationMs != null && durationMs > MAX_VIDEO_DURATION_MS) throw new ValidationError(["video duration exceeds maximum"]);
      if (width <= 0 || height <= 0) throw new ValidationError(["video dimensions are required"]);
      checksum = String(input.fileName).length ? createHash("sha256").update(`${input.ownerUserId}:${input.fileName}:${fileSizeBytes}`).digest("hex") : randomUUID().replaceAll("-", "");
    }

    const upload: ReviewMediaUpload = {
      id: randomUUID(),
      mediaType,
      ownerUserId: input.ownerUserId,
      storageProvider: "memory",
      storageKey: `review-media/uploads/${input.ownerUserId}/${randomUUID()}-${input.fileName}`,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSizeBytes,
      width,
      height,
      durationMs,
      checksum,
      processingProfile: mediaType === "video" ? "review_video_v1" : undefined,
      status,
      createdAt: nowDate.toISOString(),
      expiresAt: new Date(nowDate.getTime() + UPLOAD_TTL_MS).toISOString()
    };
    this.mediaUploadsById.set(upload.id, upload);
    return upload;
  }

  async finalizeMediaUpload(input: { uploadId: string; ownerUserId: string; fileSizeBytes?: number; durationMs?: number; width?: number; height?: number; checksum?: string }): Promise<ReviewMediaUpload> {
    const upload = this.mediaUploadsById.get(input.uploadId);
    if (!upload) throw new ValidationError(["upload not found"]);
    if (upload.ownerUserId !== input.ownerUserId) throw new ValidationError(["cannot finalize another user's upload"]);
    if (upload.status !== "pending") throw new ValidationError(["upload cannot be finalized"]);
    if (Date.parse(upload.expiresAt) < Date.now()) {
      upload.status = "expired";
      throw new ValidationError(["upload expired"]);
    }
    if (upload.mediaType !== "video") throw new ValidationError(["upload is already finalized"]);
    upload.fileSizeBytes = Number(input.fileSizeBytes ?? upload.fileSizeBytes);
    upload.durationMs = Number(input.durationMs ?? upload.durationMs ?? 0);
    upload.width = Number(input.width ?? upload.width);
    upload.height = Number(input.height ?? upload.height);
    upload.checksum = String(input.checksum ?? upload.checksum);

    if (upload.fileSizeBytes <= 0 || upload.fileSizeBytes > MAX_VIDEO_BYTES) throw new ValidationError(["invalid video file size"]);
    if (upload.durationMs <= 0 || upload.durationMs > MAX_VIDEO_DURATION_MS) throw new ValidationError(["invalid video duration"]);
    if (upload.width <= 0 || upload.height <= 0) throw new ValidationError(["invalid video dimensions"]);
    upload.status = "uploaded";
    return upload;
  }

  async getMediaUpload(uploadId: string): Promise<ReviewMediaUpload | null> {
    const upload = this.mediaUploadsById.get(uploadId);
    return upload ?? null;
  }

  async reportReviewMedia(mediaId: string, userId: string, reason: string): Promise<void> {
    const media = this.findMedia(mediaId);
    if (!media) throw new ValidationError(["review media not found"]);
    this.mediaReports.push({ mediaId: media.id, reviewId: media.reviewId, reporterUserId: userId, reason, createdAt: new Date().toISOString() });
    if (media.moderationState === "published") {
      await this.setReviewMediaModerationState(media.reviewId, media.id, "flagged", "reported_by_user");
    }
  }

  async setReviewMediaModerationState(reviewId: string, mediaId: string, state: ModerationState, reason?: string, now = new Date()): Promise<ReviewMedia> {
    const row = this.byId.get(reviewId);
    if (!row) throw new ValidationError(["review not found"]);
    const target = row.media.find((item) => item.id === mediaId);
    if (!target) throw new ValidationError(["review media not found"]);
    target.moderationState = state;
    target.moderationReason = reason;
    target.visibilityState = state === "published" && target.processingState === "ready" ? "public" : "blocked";
    target.updatedAt = now.toISOString();
    if (state === "removed") target.removedAt = target.updatedAt;
    row.media = normalizeMediaOrdering(row.media.filter((item) => item.moderationState !== "removed"));
    row.mediaCount = row.media.length;
    return target;
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

  private attachUploadsToReview(review: ReviewRow, actorUserId: string, uploadIds: string[], now: Date, append = false): ReviewMedia[] {
    const nowIso = now.toISOString();
    const activeMedia = (append ? review.media : []).filter((item) => item.moderationState !== "removed");

    const attached = uploadIds.map((uploadId, index) => {
      const upload = this.mediaUploadsById.get(uploadId);
      if (!upload) throw new ValidationError(["upload not found"]);
      if (upload.ownerUserId !== actorUserId) throw new ValidationError(["cannot attach another user's upload"]);
      if (upload.status !== "uploaded") throw new ValidationError(["upload must be finalized before attach"]);
      if (Date.parse(upload.expiresAt) < now.getTime()) {
        upload.status = "expired";
        throw new ValidationError(["upload expired"]);
      }

      const nextPhotos = activeMedia.filter((item) => item.mediaType === "photo").length + (upload.mediaType === "photo" ? 1 : 0);
      const nextVideos = activeMedia.filter((item) => item.mediaType === "video").length + (upload.mediaType === "video" ? 1 : 0);
      if (nextPhotos > MAX_PHOTOS_PER_REVIEW) throw new ValidationError(["too many photos attached to review"]);
      if (nextVideos > MAX_VIDEOS_PER_REVIEW) throw new ValidationError(["too many videos attached to review"]);

      upload.status = "attached";
      upload.attachedReviewId = review.id;
      const isVideo = upload.mediaType === "video";
      const media: ReviewMedia = {
        id: randomUUID(),
        reviewId: review.id,
        mediaType: upload.mediaType,
        storageProvider: upload.storageProvider,
        storageKey: upload.storageKey,
        mimeType: upload.mimeType,
        fileName: upload.fileName,
        fileSizeBytes: upload.fileSizeBytes,
        width: upload.width,
        height: upload.height,
        checksum: upload.checksum,
        displayOrder: index,
        isPrimary: false,
        moderationState: "pending",
        processingState: isVideo ? "queued" : "ready",
        visibilityState: "owner_only",
        uploadedByUserId: actorUserId,
        durationMs: upload.durationMs,
        playbackUrl: isVideo ? `/v1/review-media/${upload.id}/playback` : undefined,
        posterUrl: isVideo ? `/v1/review-media/${upload.id}/poster` : undefined,
        variants: {
          thumbnailUrl: isVideo ? `/v1/review-media/${upload.id}/poster` : `/v1/review-media/${upload.id}?variant=thumbnail`,
          mediumUrl: isVideo ? `/v1/review-media/${upload.id}/playback` : `/v1/review-media/${upload.id}?variant=medium`,
          fullUrl: isVideo ? `/v1/review-media/${upload.id}/playback` : `/v1/review-media/${upload.id}?variant=full`
        },
        createdAt: nowIso,
        updatedAt: nowIso
      };
      if (isVideo) {
        media.processingState = "processing";
        media.processingState = "ready";
        media.visibilityState = "public";
      }
      return media;
    });

    return normalizeMediaOrdering(append ? [...review.media, ...attached] : attached);
  }

  private findMedia(mediaId: string): ReviewMedia | null {
    for (const review of this.byId.values()) {
      const media = review.media.find((item) => item.id === mediaId);
      if (media) return media;
    }
    return null;
  }

  private toView(row: ReviewRow, viewerUserId?: string): PlaceReview {
    const votes = this.helpfulVotes.get(row.id) ?? new Set<string>();
    row.helpfulCount = votes.size;
    const mediaVisible = row.media
      .filter((item) => {
        if (row.deletedAt || row.moderationState !== "published") return viewerUserId === row.authorUserId && item.uploadedByUserId === viewerUserId;
        if (viewerUserId === row.authorUserId) return item.moderationState !== "removed";
        if (item.mediaType === "video") return item.moderationState === "published" && item.processingState === "ready";
        return item.moderationState === "published";
      });
    const media = normalizeMediaOrdering(mediaVisible);
    return {
      ...row,
      media,
      mediaCount: media.length,
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
