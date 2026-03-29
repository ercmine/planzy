import { describe, expect, it } from "vitest";
import { MemoryReviewsStore } from "../memoryStore.js";
import { aggregateVerificationLevel, evaluateReviewQuality } from "../trust.js";
describe("review trust domain", () => {
    it("evaluates stricter trusted quality thresholds", () => {
        const low = evaluateReviewQuality({ body: "Great place", mediaCount: 0, rating: 5 });
        const high = evaluateReviewQuality({
            body: "Fantastic menu variety and really attentive service. We tried two entrees, dessert, and drinks; prices felt fair and the ambience was calm for a weekday dinner.",
            mediaCount: 2,
            rating: 5,
            placeCategory: "restaurant"
        });
        expect(low.isTrustedEligible).toBe(false);
        expect(high.isTrustedEligible).toBe(true);
        expect(high.qualityScore).toBeGreaterThan(low.qualityScore);
    });
    it("aggregates verification evidence levels", () => {
        const weak = aggregateVerificationLevel([{ id: "1", userId: "u1", placeId: "p", reviewId: "r1", evidenceType: "check_in", sourceType: "system", evidenceStatus: "active", confidenceScore: 20, strengthLevel: "weak", observedAt: new Date().toISOString(), privacyClass: "sensitive", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]);
        const verified = aggregateVerificationLevel([
            { id: "1", userId: "u1", placeId: "p", reviewId: "r1", evidenceType: "check_in", sourceType: "system", evidenceStatus: "active", confidenceScore: 60, strengthLevel: "medium", observedAt: new Date().toISOString(), privacyClass: "sensitive", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "2", userId: "u1", placeId: "p", reviewId: "r1", evidenceType: "receipt", sourceType: "integration", evidenceStatus: "active", confidenceScore: 70, strengthLevel: "strong", observedAt: new Date().toISOString(), privacyClass: "restricted", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "3", userId: "u1", placeId: "p", reviewId: "r1", evidenceType: "admin_manual_verification", sourceType: "admin", evidenceStatus: "active", confidenceScore: 60, strengthLevel: "strong", observedAt: new Date().toISOString(), privacyClass: "restricted", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        ]);
        expect(weak.verificationLevel).toBe("none");
        expect(weak.publicLabel).toBe("Not verified");
        expect(verified.verificationLevel).toBe("verified");
    });
    it("uses trust scoring and designation in ranking", async () => {
        const store = new MemoryReviewsStore();
        const now = new Date("2026-01-01T00:00:00.000Z");
        const trustedAuthor = "trusted-user";
        for (let i = 0; i < 12; i += 1) {
            const review = await store.createOrReplace({
                placeId: `seed-${i}`,
                authorUserId: trustedAuthor,
                authorProfileId: trustedAuthor,
                authorProfileType: "PERSONAL",
                authorDisplayName: "Trusted",
                body: "Detailed review with specific notes about service, quality, and value. This includes multiple specifics and contextual visit tips.",
                rating: 5,
                editWindowMinutes: 10,
                now
            });
            await store.voteHelpful(review.id, `voter-${i}`);
            await store.upsertVerificationEvidence({ userId: trustedAuthor, placeId: `seed-${i}`, linkedReviewId: review.id, evidenceType: "check_in", evidenceStrength: 100 });
        }
        const strong = await store.createOrReplace({
            placeId: "p1",
            authorUserId: trustedAuthor,
            authorProfileId: trustedAuthor,
            authorProfileType: "PERSONAL",
            authorDisplayName: "Trusted",
            body: "We visited around 7pm. Staff were warm, the tasting menu was balanced, and portions matched the price. Booking helped avoid wait times.",
            rating: 5,
            editWindowMinutes: 10,
            now
        });
        await store.voteHelpful(strong.id, "fan-1");
        await store.upsertVerificationEvidence({ userId: trustedAuthor, placeId: "p1", linkedReviewId: strong.id, evidenceType: "check_in", evidenceStrength: 100 });
        await store.createOrReplace({
            placeId: "p1",
            authorUserId: "new-user",
            authorProfileId: "new-user",
            authorProfileType: "PERSONAL",
            authorDisplayName: "New",
            body: "ok place",
            rating: 4,
            editWindowMinutes: 10,
            now
        });
        const ranked = await store.listByPlace({ placeId: "p1", sort: "trusted" });
        expect(ranked.reviews[0]?.id).toBe(strong.id);
        expect(ranked.reviews[0]?.trust.reviewTrustDesignation).toMatch(/trusted/);
    });
});
