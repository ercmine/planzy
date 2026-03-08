import type { ReviewsStore } from "../reviews/store.js";
import type { ModerationEnforcementPort } from "./service.js";
import type { ModerationState, ModerationTargetRef } from "./types.js";

function mapReviewState(state: ModerationState): "published" | "pending" | "flagged" | "hidden" | "removed" {
  if (state === "active" || state === "restored") return "published";
  if (state === "pending_review" || state === "escalated") return "flagged";
  if (state === "auto_limited") return "hidden";
  if (state === "hidden") return "hidden";
  if (state === "removed" || state === "rejected") return "removed";
  return "flagged";
}

export class ReviewsModerationEnforcementAdapter implements ModerationEnforcementPort {
  constructor(private readonly reviewsStore: ReviewsStore) {}

  async applyState(target: ModerationTargetRef, state: ModerationState, reasonCode: string): Promise<void> {
    if (target.targetType === "review") {
      await this.reviewsStore.setModerationState(target.targetId, mapReviewState(state), reasonCode);
      return;
    }
    if (target.targetType === "review_media" && target.reviewId) {
      await this.reviewsStore.setReviewMediaModerationState(target.reviewId, target.targetId, mapReviewState(state), reasonCode);
      return;
    }
    if (target.targetType === "business_review_response") {
      const action = state === "restored" || state === "active"
        ? "approved"
        : state === "hidden" || state === "auto_limited"
          ? "hidden"
          : state === "removed" || state === "rejected"
            ? "removed"
            : "submitted_for_review";
      await this.reviewsStore.moderateBusinessReviewResponse({ responseId: target.targetId, action, actedByUserId: "moderation-system", reasonCode });
    }
  }
}
