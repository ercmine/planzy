import { describe, expect, it } from "vitest";
import { MemoryGamificationControlStore } from "../memoryStore.js";
import { GamificationControlService } from "../service.js";
describe("GamificationControlService", () => {
    it("evaluates xp, badges, quests, streaks, leaderboard and suppression", () => {
        const service = new GamificationControlService(new MemoryGamificationControlStore());
        service.seedInitialRules("admin");
        const first = service.processEvent({
            eventId: "e1",
            userId: "u1",
            actionType: "place_reviewed",
            occurredAt: "2026-01-01T00:00:00.000Z",
            canonicalPlaceId: "cp_1",
            trustScore: 90,
            moderationState: "approved",
            qualityScore: 0.9,
            source: "app"
        });
        expect(first.suppressed).toBe(false);
        expect(first.awardedXp).toBeGreaterThan(0);
        service.processEvent({
            eventId: "e2",
            userId: "u1",
            actionType: "place_reviewed",
            occurredAt: "2026-01-02T00:00:00.000Z",
            canonicalPlaceId: "cp_2",
            trustScore: 90,
            moderationState: "approved",
            source: "app"
        });
        const questDone = service.processEvent({
            eventId: "e3",
            userId: "u1",
            actionType: "place_reviewed",
            occurredAt: "2026-01-03T00:00:00.000Z",
            canonicalPlaceId: "cp_3",
            trustScore: 90,
            moderationState: "approved",
            source: "app"
        });
        expect(questDone.completedQuestIds).toContain("quest_weekly_reviews");
        service.processEvent({
            eventId: "e3b",
            userId: "u1",
            actionType: "place_saved",
            occurredAt: "2026-01-03T00:02:00.000Z",
            canonicalPlaceId: "cp_9",
            trustScore: 90,
            moderationState: "approved",
            source: "app"
        });
        const suppressed = service.processEvent({
            eventId: "e4",
            userId: "u1",
            actionType: "place_saved",
            occurredAt: "2026-01-03T00:01:00.000Z",
            trustScore: 10,
            moderationState: "approved",
            source: "app"
        });
        expect(suppressed.suppressed).toBe(true);
        expect(suppressed.reasons).toContain("low_trust_suppressed");
        const summary = service.getProgressionSummary("u1");
        expect(summary.totalXp).toBeGreaterThan(100);
        expect(summary.badges.length).toBeGreaterThan(0);
        expect(summary.leaderboardScore).toBeGreaterThan(0);
    });
    it("supports draft/publish and recompute", () => {
        const service = new GamificationControlService(new MemoryGamificationControlStore());
        const seed = service.seedInitialRules("admin");
        const draft = service.createDraft("admin", "tune xp");
        const active = service.publishRuleVersion(draft.id, "admin", "2026-01-01T00:00:00.000Z");
        expect(active.lifecycle).toBe("active");
        expect(active.version).toBe(seed.version + 1);
        service.processEvent({
            eventId: "ev_recompute",
            userId: "user_r",
            actionType: "creator_video_published",
            occurredAt: "2026-02-01T00:00:00.000Z",
            trustScore: 80,
            moderationState: "approved",
            source: "app"
        });
        const before = service.getProgressionSummary("user_r").totalXp;
        service.recomputeUser("user_r", "admin");
        const after = service.getProgressionSummary("user_r").totalXp;
        expect(after).toBeGreaterThanOrEqual(before);
    });
});
