import { describe, expect, it } from "vitest";

import { ModerationService } from "../../moderation/service.js";
import { TrustSafetyService } from "../service.js";

describe("TrustSafetyService", () => {
  it("applies moderation penalties to content trust", async () => {
    const moderation = new ModerationService();
    const service = new TrustSafetyService(moderation);
    const target = { targetType: "place_review_video" as const, targetId: "vid-1", placeId: "place-1", subjectUserId: "creator-1" };

    await moderation.submitReport({ target, reporterUserId: "u1", reasonCode: "spam" });
    await moderation.submitReport({ target, reporterUserId: "u2", reasonCode: "spam" });
    await moderation.submitReport({ target, reporterUserId: "u3", reasonCode: "spam" });

    const summary = service.getContentSummary(target, 0.75);
    expect(summary.moderationState).toBe("pending_review");
    expect(summary.trustScore).toBeLessThan(0.75);
    expect(summary.badges).toContain("under_review");
  });

  it("aggregates creator and place trust", async () => {
    const moderation = new ModerationService();
    const service = new TrustSafetyService(moderation);

    const clean = { targetType: "place_review_video" as const, targetId: "vid-clean", placeId: "p1", subjectUserId: "creator-1" };
    const removed = { targetType: "place_review_video" as const, targetId: "vid-removed", placeId: "p1", subjectUserId: "creator-1" };
    await moderation.adminDecision({ target: removed, actorUserId: "mod-1", decisionType: "remove", reasonCode: "spam" });

    const creator = service.summarizeCreator({ creatorUserId: "creator-1", contentTargets: [clean, removed] });
    expect(creator.hiddenOrRejectedCount).toBe(1);
    expect(creator.trustScore).toBeLessThan(0.6);

    const place = service.summarizePlace({ placeId: "p1", contentTargets: [clean, removed] });
    expect(place.totalContentCount).toBe(2);
    expect(place.moderationIssueCount).toBeGreaterThan(0);
  });
});
