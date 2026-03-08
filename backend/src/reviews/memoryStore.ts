import { randomUUID } from "node:crypto";

import type { CreateReviewInput, PlaceReview, ReviewsStore } from "./store.js";

export class MemoryReviewsStore implements ReviewsStore {
  private readonly byPlaceId = new Map<string, PlaceReview[]>();

  async listByPlace(placeId: string): Promise<PlaceReview[]> {
    return [...(this.byPlaceId.get(placeId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async create(input: CreateReviewInput): Promise<PlaceReview> {
    const review: PlaceReview = {
      id: randomUUID(),
      placeId: input.placeId,
      userId: input.userId,
      actingProfileType: input.actingProfileType ?? "PERSONAL",
      actingProfileId: input.actingProfileId ?? input.userId,
      displayName: input.displayName,
      rating: input.rating,
      text: input.text,
      anonymous: input.anonymous,
      createdAt: (input.createdAt ?? new Date()).toISOString()
    };

    const existing = this.byPlaceId.get(input.placeId) ?? [];
    this.byPlaceId.set(input.placeId, [review, ...existing]);
    return review;
  }
}
