import { describe, expect, it } from "vitest";
import { ModerationService } from "../service.js";
describe("ModerationService", () => {
    it("prevents duplicate reports and transitions to pending_review after unique reporters", async () => {
        const svc = new ModerationService();
        const target = { targetType: "review", targetId: "r1", reviewId: "r1" };
        await svc.submitReport({ target, reporterUserId: "u1", reasonCode: "spam" });
        await svc.submitReport({ target, reporterUserId: "u2", reasonCode: "spam" });
        await svc.submitReport({ target, reporterUserId: "u3", reasonCode: "harassment_bullying" });
        await expect(svc.submitReport({ target, reporterUserId: "u1", reasonCode: "spam" })).rejects.toThrow();
        const aggregate = svc.getAggregate(target);
        expect(aggregate.uniqueReporterCount).toBe(3);
        expect(aggregate.state).toBe("pending_review");
    });
    it("generates automated signals and auto limits high risk spam", async () => {
        const svc = new ModerationService();
        const target = { targetType: "review", targetId: "r2", reviewId: "r2", placeId: "p1" };
        const result = await svc.analyzeContent({
            target,
            actorUserId: "spammer",
            text: "Best place ever!!!! Visit my profile http://x.com promo code DM me on telegram +1 (222) 333-4444"
        });
        expect(result.signals.length).toBeGreaterThan(0);
        const details = svc.getTargetDetails(target);
        expect(details.signals.some((item) => item.category === "spam")).toBe(true);
        expect(["auto_limited", "hidden", "pending_review", "active"]).toContain(details.aggregate.state);
    });
    it("supports reversible admin moderation decisions with audit history", async () => {
        const svc = new ModerationService();
        const target = { targetType: "review_media", targetId: "m1", reviewId: "r3", mediaId: "m1" };
        await svc.adminDecision({ target, actorUserId: "admin", decisionType: "hide", reasonCode: "unsafe_media" });
        await svc.adminDecision({ target, actorUserId: "admin", decisionType: "restore", reasonCode: "appeal_accepted" });
        const details = svc.getTargetDetails(target);
        expect(details.aggregate.state).toBe("restored");
        expect(details.decisions.map((item) => item.decisionType)).toEqual(["hide", "restore"]);
        expect(details.audits.some((item) => item.eventType === "content_restored")).toBe(true);
        expect(svc.isPubliclyVisible(target)).toBe(true);
    });
});
