import { describe, expect, it } from "vitest";

import { ReviewsModerationEnforcementAdapter } from "../enforcement.js";
import { ModerationService } from "../service.js";
import { MemoryReviewsStore } from "../../reviews/memoryStore.js";

const PHOTO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZQn8AAAAASUVORK5CYII=";

describe("launch moderation workflows", () => {
  it("applies admin hide/restore decisions to public review visibility", async () => {
    const reviews = new MemoryReviewsStore();
    const moderation = new ModerationService(new ReviewsModerationEnforcementAdapter(reviews));

    const review = await reviews.createOrReplace({
      placeId: "launch-place",
      authorUserId: "reviewer-1",
      authorProfileType: "PERSONAL",
      authorProfileId: "reviewer-1",
      authorDisplayName: "Reviewer One",
      body: "good spot",
      editWindowMinutes: 30
    });
    await reviews.setModerationState(review.id, "published");

    expect((await reviews.listByPlace({ placeId: "launch-place" })).reviews).toHaveLength(1);

    const target = { targetType: "review" as const, targetId: review.id, reviewId: review.id };
    await moderation.adminDecision({ target, actorUserId: "mod-1", decisionType: "hide", reasonCode: "abusive" });

    expect((await reviews.listByPlace({ placeId: "launch-place" })).reviews).toHaveLength(0);

    await moderation.adminDecision({ target, actorUserId: "mod-1", decisionType: "restore", reasonCode: "appeal_accepted" });
    expect((await reviews.listByPlace({ placeId: "launch-place" })).reviews).toHaveLength(1);
  });

  it("routes reported review media into moderation queue and supports removal", async () => {
    const reviews = new MemoryReviewsStore();
    const moderation = new ModerationService(new ReviewsModerationEnforcementAdapter(reviews));

    const upload = await reviews.createMediaUpload({
      ownerUserId: "reviewer-2",
      mediaType: "photo",
      fileName: "photo.png",
      mimeType: "image/png",
      base64Data: PHOTO_BASE64
    });

    const review = await reviews.createOrReplace({
      placeId: "launch-place-2",
      authorUserId: "reviewer-2",
      authorProfileType: "PERSONAL",
      authorProfileId: "reviewer-2",
      authorDisplayName: "Reviewer Two",
      body: "has media",
      mediaUploadIds: [upload.id],
      editWindowMinutes: 30
    });
    await reviews.setModerationState(review.id, "published");
    const mediaId = review.media[0].id;
    await reviews.setReviewMediaModerationState(review.id, mediaId, "published");

    const mediaTarget = { targetType: "review_media" as const, targetId: mediaId, reviewId: review.id, mediaId };
    await moderation.submitReport({ target: mediaTarget, reporterUserId: "r1", reasonCode: "unsafe_media" });
    await moderation.submitReport({ target: mediaTarget, reporterUserId: "r2", reasonCode: "unsafe_media" });
    await moderation.submitReport({ target: mediaTarget, reporterUserId: "r3", reasonCode: "unsafe_media" });

    const queue = moderation.listQueue({ targetType: "review_media", unresolvedOnly: true });
    expect(queue.length).toBeGreaterThan(0);

    await moderation.adminDecision({ target: mediaTarget, actorUserId: "mod-2", decisionType: "remove", reasonCode: "unsafe_media" });

    const after = await reviews.getById(review.id, undefined, true);
    expect(after?.media.some((item) => item.id === mediaId)).toBe(false);
  });
});
