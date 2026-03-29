import { describe, expect, it } from "vitest";
import { MemorySocialGamificationStore } from "../memoryStore.js";
import { SocialGamificationService } from "../service.js";
describe("social gamification service", () => {
    it("tracks friend challenge progress, blocks duplicate place farming, and creates shareable completion moments", async () => {
        const service = new SocialGamificationService(new MemorySocialGamificationStore());
        await service.recordAction({ eventId: "a-1", actorUserId: "u1", type: "review_created", canonicalPlaceId: "p-1", cityId: "city-minneapolis", contentState: "published", trustScore: 60 });
        await service.recordAction({ eventId: "a-2", actorUserId: "u1", type: "review_created", canonicalPlaceId: "p-1", cityId: "city-minneapolis", contentState: "published", trustScore: 60 });
        const feed = service.getFeed("u1", "city-minneapolis");
        const instance = feed.friendChallenges[0];
        expect(instance?.participantProgress.u1.points).toBe(1);
        await service.recordAction({ eventId: "a-3", actorUserId: "u2", type: "review_created", canonicalPlaceId: "p-2", cityId: "city-minneapolis", contentState: "approved", trustScore: 70 });
        await service.recordAction({ eventId: "a-4", actorUserId: "u1", type: "review_created", canonicalPlaceId: "p-3", cityId: "city-minneapolis", contentState: "published", trustScore: 75 });
        await service.recordAction({ eventId: "a-5", actorUserId: "u2", type: "review_created", canonicalPlaceId: "p-4", cityId: "city-minneapolis", contentState: "approved", trustScore: 72 });
        await service.recordAction({ eventId: "a-6", actorUserId: "u1", type: "review_created", canonicalPlaceId: "p-5", cityId: "city-minneapolis", contentState: "published", trustScore: 80 });
        await service.recordAction({ eventId: "a-7", actorUserId: "u2", type: "review_created", canonicalPlaceId: "p-6", cityId: "city-minneapolis", contentState: "approved", trustScore: 73 });
        const after = service.getFeed("u1", "city-minneapolis");
        expect(after.friendChallenges[0]?.status).toBe("completed");
        const completerFeed = service.getFeed("u2", "city-minneapolis");
        expect(completerFeed.recentMoments.some((moment) => moment.type === "challenge_completion")).toBe(true);
    });
    it("aggregates city collaborative goals and exposes lightweight competition", async () => {
        const service = new SocialGamificationService(new MemorySocialGamificationStore());
        await service.recordAction({ eventId: "g-1", actorUserId: "u1", type: "place_saved", canonicalPlaceId: "p-11", cityId: "city-minneapolis", categoryIds: ["hidden_gems"], trustScore: 50 });
        await service.recordAction({ eventId: "g-2", actorUserId: "u2", type: "place_saved", canonicalPlaceId: "p-12", cityId: "city-minneapolis", categoryIds: ["hidden_gems"], trustScore: 50 });
        const feed = service.getFeed("u1", "city-minneapolis");
        expect(feed.collaborativeGoals[0]?.progress.currentPoints).toBe(2);
        expect(feed.competition?.totalParticipants).toBeGreaterThan(0);
    });
    it("enforces trust/moderation/suspicious-event protections and privacy controls", async () => {
        const service = new SocialGamificationService(new MemorySocialGamificationStore());
        service.setPrivacy({ userId: "u1", allowChallengeInvites: true, allowCompetition: false, defaultShareVisibility: "private" });
        const suspicious = await service.recordAction({ eventId: "s-1", actorUserId: "u1", type: "place_saved", canonicalPlaceId: "p-20", cityId: "city-minneapolis", suspicious: true });
        expect(suspicious.blockedReason).toBe("suspicious_ring_pattern");
        await service.recordAction({ eventId: "s-2", actorUserId: "u1", type: "review_created", canonicalPlaceId: "p-21", cityId: "city-minneapolis", contentState: "hidden", trustScore: 80 });
        const feed = service.getFeed("u1", "city-minneapolis");
        expect(feed.competition).toBeUndefined();
        expect(feed.friendChallenges[0]?.participantProgress.u1.points).toBe(0);
    });
});
