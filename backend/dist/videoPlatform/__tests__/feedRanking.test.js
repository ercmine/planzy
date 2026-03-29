import { describe, expect, it } from "vitest";
import { rankPlaceLinkedVideoFeed } from "../feedRanking.js";
const now = Date.now();
const isoDaysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString();
function video(overrides) {
    const { id, canonicalPlaceId, authorUserId, ...rest } = overrides;
    return {
        id,
        canonicalPlaceId,
        authorUserId,
        status: "published",
        moderationStatus: "approved",
        visibility: "public",
        lifecycle: { createdAt: isoDaysAgo(3), updatedAt: isoDaysAgo(1), publishedAt: isoDaysAgo(1) },
        retryCount: 0,
        engagement: { views: 100, likes: 20, saves: 8, shares: 2, completionRate: 0.5 },
        processedPlaybackUrl: `https://cdn/${id}.mp4`,
        ...rest
    };
}
describe("place linked feed ranking", () => {
    it("local scope prefers nearby place-linked content", () => {
        const ranked = rankPlaceLinkedVideoFeed({
            scope: "local",
            allVideos: [
                video({ id: "v_far", canonicalPlaceId: "p_far", authorUserId: "c1", feedDebug: { distanceMeters: 100_000 } }),
                video({ id: "v_near", canonicalPlaceId: "p_near", authorUserId: "c2", feedDebug: { distanceMeters: 900 } })
            ],
            context: { lat: 30.2, lng: -97.7 },
            limit: 10,
            placeSignalsFor: (placeId) => ({
                canonicalPlaceId: placeId,
                name: placeId,
                category: "food",
                lat: placeId === "p_near" ? 30.2005 : 31.2,
                lng: placeId === "p_near" ? -97.7005 : -98.7,
                qualityScore: 0.8,
                contentRichnessScore: 0.7,
                trustedReviewScore: 0.8,
                distanceMeters: placeId === "p_near" ? 900 : 100_000
            }),
            creatorSignalsFor: (creatorId) => ({ creatorUserId: creatorId, displayName: creatorId, handle: `@${creatorId}`, qualityScore: 0.8, trustScore: 0.8 })
        });
        expect(ranked.ranked[0]?.item.placeId).toBe("p_near");
    });
    it("diversity penalizes repeated creator and place runs", () => {
        const ranked = rankPlaceLinkedVideoFeed({
            scope: "global",
            allVideos: [
                video({ id: "v1", canonicalPlaceId: "p1", authorUserId: "c1" }),
                video({ id: "v2", canonicalPlaceId: "p1", authorUserId: "c1", engagement: { views: 2000, likes: 400, saves: 80, shares: 60, completionRate: 0.9 } }),
                video({ id: "v3", canonicalPlaceId: "p2", authorUserId: "c2" })
            ],
            limit: 10,
            placeSignalsFor: (placeId) => ({
                canonicalPlaceId: placeId,
                name: placeId,
                category: "food",
                qualityScore: 0.9,
                contentRichnessScore: 0.9,
                trustedReviewScore: 0.9
            }),
            creatorSignalsFor: (creatorId) => ({ creatorUserId: creatorId, displayName: creatorId, handle: `@${creatorId}`, qualityScore: 0.9, trustScore: 0.9 })
        });
        const suppressions = ranked.observability.diversitySuppressions;
        expect(suppressions).toBeGreaterThan(0);
        expect(ranked.ranked.map((row) => row.item.videoId)).toContain("v3");
    });
    it("filters out unpublished or moderated content from candidate pool", () => {
        const ranked = rankPlaceLinkedVideoFeed({
            scope: "global",
            allVideos: [
                video({ id: "ok", canonicalPlaceId: "p1", authorUserId: "c1" }),
                video({ id: "hidden", canonicalPlaceId: "p1", authorUserId: "c1", status: "hidden" }),
                video({ id: "flagged", canonicalPlaceId: "p1", authorUserId: "c1", moderationStatus: "flagged" }),
                video({ id: "private", canonicalPlaceId: "p1", authorUserId: "c1", visibility: "private" })
            ],
            limit: 10,
            placeSignalsFor: (placeId) => ({ canonicalPlaceId: placeId, name: placeId, category: "food", qualityScore: 0.9, contentRichnessScore: 0.8, trustedReviewScore: 0.7 }),
            creatorSignalsFor: (creatorId) => ({ creatorUserId: creatorId, displayName: creatorId, handle: `@${creatorId}`, qualityScore: 0.9, trustScore: 0.8 })
        });
        expect(ranked.ranked).toHaveLength(1);
        expect(ranked.ranked[0]?.item.videoId).toBe("ok");
    });
});
