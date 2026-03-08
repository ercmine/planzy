import { describe, expect, it } from "vitest";

import { getPlaceReviewVideoSection } from "../placeVideoSection.js";
import type { PlaceReview, ReviewsStore } from "../store.js";

function makeReview(input: Partial<PlaceReview> & { id: string; placeId: string; authorProfileId: string; authorProfileType: "PERSONAL" | "CREATOR" | "BUSINESS"; createdAt: string; mediaPlayback?: string }): PlaceReview {
  return {
    id: input.id,
    placeId: input.placeId,
    canonicalPlaceId: input.placeId,
    authorUserId: input.authorProfileId,
    authorProfileId: input.authorProfileId,
    authorProfileType: input.authorProfileType,
    author: { displayName: input.author?.displayName ?? input.authorProfileId, profileId: input.authorProfileId, profileType: input.authorProfileType, visibility: "PUBLIC" },
    body: "text",
    text: "text",
    moderationState: "published",
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    editWindowEndsAt: input.createdAt,
    helpfulCount: input.helpfulCount ?? 0,
    mediaCount: 1,
    media: [
      {
        id: `${input.id}-m1`,
        reviewId: input.id,
        mediaType: "video",
        storageProvider: "memory",
        storageKey: "k",
        mimeType: "video/mp4",
        fileName: "v.mp4",
        fileSizeBytes: 100,
        width: 100,
        height: 100,
        checksum: "x",
        displayOrder: 0,
        isPrimary: true,
        moderationState: "published",
        processingState: "ready",
        visibilityState: "public",
        uploadedByUserId: "u",
        playbackUrl: input.mediaPlayback ?? `https://cdn/${input.id}.mp4`,
        variants: { thumbnailUrl: `https://cdn/${input.id}.jpg` },
        createdAt: input.createdAt,
        updatedAt: input.createdAt
      }
    ],
    trust: {
      reviewerTrustStatus: "trusted",
      reviewTrustDesignation: input.trust?.reviewTrustDesignation ?? "standard",
      verificationLevel: input.trust?.verificationLevel ?? "none",
      verificationLabel: "",
      isVerifiedVisit: input.trust?.isVerifiedVisit ?? false,
      trustBadges: [],
      rankingBoostWeight: input.trust?.rankingBoostWeight ?? 0
    }
  };
}

describe("getPlaceReviewVideoSection", () => {
  it("filters by place and removes duplicate playback urls", async () => {
    const reviews = [
      makeReview({ id: "r1", placeId: "p1", authorProfileId: "a1", authorProfileType: "PERSONAL", createdAt: "2025-01-01T00:00:00.000Z", mediaPlayback: "https://cdn/same.mp4" }),
      makeReview({ id: "r2", placeId: "p1", authorProfileId: "a1", authorProfileType: "PERSONAL", createdAt: "2025-01-02T00:00:00.000Z", mediaPlayback: "https://cdn/same.mp4" }),
      makeReview({ id: "r3", placeId: "p2", authorProfileId: "a2", authorProfileType: "CREATOR", createdAt: "2025-01-03T00:00:00.000Z" })
    ];
    const store: ReviewsStore = {
      listByPlace: async ({ placeId }: { placeId: string }) => ({ reviews: reviews.filter((item) => item.placeId === placeId) }),
    } as unknown as ReviewsStore;

    const section = await getPlaceReviewVideoSection(store, { placeId: "p1" });
    expect(section.totalVisibleVideos).toBe(1);
    expect(section.videos[0]?.placeId).toBe("p1");
  });

  it("ranks trusted/creator higher and supports filter", async () => {
    const store: ReviewsStore = {
      listByPlace: async () => ({
        reviews: [
          makeReview({ id: "u", placeId: "p", authorProfileId: "u1", authorProfileType: "PERSONAL", createdAt: "2025-01-01T00:00:00.000Z" }),
          makeReview({ id: "c", placeId: "p", authorProfileId: "c1", authorProfileType: "CREATOR", createdAt: "2025-01-01T00:00:00.000Z", trust: { reviewTrustDesignation: "trusted", verificationLevel: "verified", isVerifiedVisit: true, rankingBoostWeight: 20 } as never }),
        ]
      })
    } as unknown as ReviewsStore;

    const all = await getPlaceReviewVideoSection(store, { placeId: "p" });
    expect(all.featuredVideo?.reviewId).toBe("c");

    const creator = await getPlaceReviewVideoSection(store, { placeId: "p", filter: "creator" });
    expect(creator.videos).toHaveLength(1);
    expect(creator.videos[0]?.author.profileType).toBe("CREATOR");
  });
});
