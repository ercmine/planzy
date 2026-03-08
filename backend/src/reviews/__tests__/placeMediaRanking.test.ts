import { describe, expect, it } from "vitest";

import {
  getPlaceCardMedia,
  getPlaceMediaGallery,
  getPlaceVideoShelf,
  rankPlaceMedia,
  scorePlaceMediaItem,
  selectPlaceHeroMedia,
  type PlaceMediaCandidate
} from "../placeMediaRanking.js";

function candidate(overrides: Partial<PlaceMediaCandidate> & { id: string; mediaType?: "photo" | "video"; createdAt?: string } ): PlaceMediaCandidate {
  return {
    id: overrides.id,
    mediaType: overrides.mediaType ?? "photo",
    placeId: overrides.placeId ?? "p1",
    sourceType: overrides.sourceType ?? "review_user",
    sourceId: overrides.sourceId,
    imageUrl: overrides.mediaType === "video" ? undefined : `https://cdn/${overrides.id}.jpg`,
    playbackUrl: overrides.mediaType === "video" ? `https://cdn/${overrides.id}.mp4` : undefined,
    thumbnailUrl: `https://cdn/${overrides.id}-thumb.jpg`,
    posterUrl: overrides.mediaType === "video" ? `https://cdn/${overrides.id}-poster.jpg` : undefined,
    caption: overrides.caption,
    title: overrides.title,
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt,
    relevanceScoreHint: overrides.relevanceScoreHint ?? 0.8,
    placeAssociationConfidence: overrides.placeAssociationConfidence ?? 0.95,
    categoryRelevanceScore: overrides.categoryRelevanceScore ?? 0.8,
    author: {
      profileId: overrides.author?.profileId ?? "author-1",
      profileType: overrides.author?.profileType ?? "PERSONAL",
      uploaderTrustScore: overrides.author?.uploaderTrustScore ?? 0.6,
      historicalSpamPenalty: overrides.author?.historicalSpamPenalty ?? 0
    },
    trust: {
      isTrusted: overrides.trust?.isTrusted ?? false,
      isVerifiedVisit: overrides.trust?.isVerifiedVisit ?? false,
      moderationConfidence: overrides.trust?.moderationConfidence ?? 0.9,
      reviewTrustWeight: overrides.trust?.reviewTrustWeight ?? 0,
      isBusinessVerifiedOrigin: overrides.trust?.isBusinessVerifiedOrigin ?? false,
      abusePenalty: overrides.trust?.abusePenalty ?? 0
    },
    engagement: {
      views: overrides.engagement?.views ?? 120,
      helpfulVotes: overrides.engagement?.helpfulVotes ?? 12,
      saves: overrides.engagement?.saves ?? 6,
      watchCompletionRate: overrides.engagement?.watchCompletionRate ?? 0.7,
      watchCompletions: overrides.engagement?.watchCompletions ?? 20,
      reports: overrides.engagement?.reports ?? 0,
      hides: overrides.engagement?.hides ?? 0,
      skips: overrides.engagement?.skips ?? 0
    },
    quality: {
      width: overrides.quality?.width ?? 1600,
      height: overrides.quality?.height ?? 1000,
      durationMs: overrides.quality?.durationMs,
      fileSizeBytes: overrides.quality?.fileSizeBytes,
      hasThumbnail: overrides.quality?.hasThumbnail ?? true,
      hasPoster: overrides.quality?.hasPoster ?? true,
      hasPlayableVideo: overrides.quality?.hasPlayableVideo ?? true,
      hasPrimaryAsset: overrides.quality?.hasPrimaryAsset ?? true,
      processingState: overrides.quality?.processingState ?? "ready",
      blurScore: overrides.quality?.blurScore,
      visionQualityScore: overrides.quality?.visionQualityScore
    },
    moderation: {
      moderationState: overrides.moderation?.moderationState ?? "published",
      visibilityState: overrides.moderation?.visibilityState ?? "public",
      isDeleted: overrides.moderation?.isDeleted,
      removedAt: overrides.moderation?.removedAt,
      isPrivate: overrides.moderation?.isPrivate,
      legalBlocked: overrides.moderation?.legalBlocked
    },
    fingerprint: overrides.fingerprint ?? overrides.id
  };
}

describe("place media ranking", () => {
  it("penalizes tiny or unready quality media", () => {
    const strong = scorePlaceMediaItem(candidate({ id: "strong" }), "place_detail_hero", true);
    const weak = scorePlaceMediaItem(candidate({ id: "weak", quality: { width: 180, height: 120, hasThumbnail: false, processingState: "failed" } as never }), "place_detail_hero", true);
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("gives recency advantages without only newest sort", () => {
    const recentStrong = candidate({ id: "recent", createdAt: "2026-02-10T00:00:00.000Z" });
    const oldVeryStrong = candidate({ id: "old", createdAt: "2023-02-10T00:00:00.000Z", quality: { width: 3000, height: 2000 } as never, trust: { isTrusted: true, isVerifiedVisit: true } as never });
    const ranked = rankPlaceMedia({ placeId: "p1", mediaItems: [oldVeryStrong, recentStrong], surface: "place_detail_hero" });
    expect(ranked[0]?.item.id).toBe("old");
  });

  it("trust boosts can beat low quality spam", () => {
    const trusted = candidate({ id: "trusted", trust: { isTrusted: true, isVerifiedVisit: true, reviewTrustWeight: 20 } as never, author: { profileId: "a-trusted", profileType: "PERSONAL" } as never });
    const spam = candidate({ id: "spam", quality: { width: 640, height: 480 } as never, trust: { abusePenalty: 0.9 } as never, engagement: { views: 2000, helpfulVotes: 2, reports: 20, hides: 8 } as never });
    const ranked = rankPlaceMedia({ placeId: "p1", mediaItems: [spam, trusted], surface: "place_detail_gallery" });
    expect(ranked[0]?.item.id).toBe("trusted");
  });

  it("filters invalid media before ranking", () => {
    const valid = candidate({ id: "valid" });
    const removed = candidate({ id: "removed", moderation: { moderationState: "removed", removedAt: "2026-01-03T00:00:00.000Z" } as never });
    const hidden = candidate({ id: "hidden", moderation: { moderationState: "hidden" } as never });
    const ranked = rankPlaceMedia({ placeId: "p1", mediaItems: [valid, removed, hidden], surface: "place_detail_gallery" });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.item.id).toBe("valid");
  });

  it("suppresses duplicates and limits uploader domination", () => {
    const media = [
      candidate({ id: "a1", author: { profileId: "u1", profileType: "PERSONAL" } as never, fingerprint: "dup" }),
      candidate({ id: "a2", author: { profileId: "u1", profileType: "PERSONAL" } as never, fingerprint: "dup" }),
      candidate({ id: "a3", author: { profileId: "u1", profileType: "PERSONAL" } as never }),
      candidate({ id: "b1", author: { profileId: "u2", profileType: "PERSONAL" } as never, trust: { isTrusted: true } as never }),
      candidate({ id: "c1", mediaType: "video", author: { profileId: "u3", profileType: "CREATOR" } as never }),
    ];
    const ranked = rankPlaceMedia({ placeId: "p1", mediaItems: media, surface: "place_detail_gallery", limit: 5 });
    expect(ranked.find((item) => item.item.id === "a2")).toBeUndefined();
    expect(new Set(ranked.slice(0, 3).map((item) => item.item.author.profileId)).size).toBeGreaterThan(1);
  });

  it("supports hero, gallery, card, and video shelf helpers", () => {
    const media = [
      candidate({ id: "photo-hero", mediaType: "photo", trust: { isTrusted: true } as never }),
      candidate({ id: "video-1", mediaType: "video", sourceType: "review_creator", author: { profileId: "cr1", profileType: "CREATOR" } as never }),
      candidate({ id: "photo-2", mediaType: "photo", author: { profileId: "u2", profileType: "PERSONAL" } as never })
    ];

    const hero = selectPlaceHeroMedia("p1", media);
    const gallery = getPlaceMediaGallery("p1", media, 6);
    const card = getPlaceCardMedia("p1", media);
    const videoShelf = getPlaceVideoShelf("p1", media, 6);

    expect(hero?.item.mediaType).toBe("photo");
    expect(gallery.length).toBeGreaterThan(1);
    expect(card?.item.id).toBe("photo-hero");
    expect(videoShelf.every((item) => item.item.mediaType === "video")).toBe(true);
  });
});
