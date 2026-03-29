import { describe, expect, it } from "vitest";
import { MemoryDryadEconomyStore } from "../memoryStore.js";
import { DryadEconomyService } from "../service.js";
describe("DryadEconomyService", () => {
    it("supports quest funding/completion and treasury burn splits", () => {
        const service = new DryadEconomyService(new MemoryDryadEconomyStore());
        service.creditBusiness("owner", 1000, "seed");
        service.creditUser("explorer", 10, "seed");
        service.updateTokenSplitConfig({
            feature: "business_quest",
            rewardPoolBps: 5000,
            creatorPoolBps: 1000,
            treasuryBps: 3000,
            burnBps: 500,
            partnerBps: 500,
            actor: "admin",
            updatedBy: "admin"
        });
        const quest = service.createBusinessQuest({
            businessId: "owner",
            createdBy: "owner",
            placeId: "place-1",
            title: "Lunch check-in",
            actionType: "visit_checkin",
            rewardDryad: 3,
            budgetDryad: 30,
            dailyCap: 20,
            totalCap: 100,
            startsAt: new Date(Date.now() - 1000).toISOString(),
            endsAt: new Date(Date.now() + 86400000).toISOString()
        });
        expect(quest.status).toBe("active");
        const completion = service.completeQuest({ questId: quest.id, userId: "explorer", deviceTrustScore: 0.9 });
        expect(completion.status).toBe("approved");
        const consumer = service.consumerDashboard("explorer");
        expect(consumer.wallet.balanceAtomic).toBe(13000000n);
        const admin = service.adminDashboard();
        expect(admin.treasuryAtomic).toBeGreaterThan(0n);
        expect(admin.burnedAtomic).toBeGreaterThan(0n);
    });
    it("tracks exploration streaks, collections, creator claims and membership purchase", () => {
        const service = new DryadEconomyService(new MemoryDryadEconomyStore());
        service.creditUser("user-1", 500, "seed");
        const checkIn = service.recordExplorationCheckIn({
            userId: "user-1",
            placeId: "p1",
            neighborhoodId: "n1",
            verified: true,
            dwellSeconds: 140
        });
        expect(checkIn.payoutAtomic).toBeGreaterThan(0n);
        service.upsertCollection({
            id: "c1",
            title: "Coffee Run",
            placeIds: ["p1", "p2"],
            milestoneRewardsAtomic: [1000000n],
            completionRewardAtomic: 2000000n,
            active: true
        }, "admin");
        const first = service.progressCollection({ userId: "user-1", collectionId: "c1", placeId: "p1" });
        expect(first.payoutAtomic).toBe(1000000n);
        const creator = service.recordCreatorEngagement({
            userId: "user-1",
            contentId: "content-1",
            contentType: "video_review",
            qualitySignals: { saves: 4, shares: 2, completionRate: 0.65, helpfulVotes: 5, visitsDriven: 2, redemptionsDriven: 1 },
            trustTier: "gold",
            moderationState: "approved"
        });
        expect(creator.status).toBe("claimable");
        const claimed = service.claimCreatorReward({ rewardId: creator.id, userId: "user-1" });
        expect(claimed.status).toBe("paid");
        const membership = service.purchaseMembership({ userId: "user-1", tier: "pro", months: 1, autoRenew: true, actor: "user-1" });
        expect(membership.active).toBe(true);
        expect(new Date(membership.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
});
