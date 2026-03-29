import { describe, expect, it } from "vitest";
import { MemoryReviewsStore } from "../memoryStore.js";
describe("MemoryReviewsStore video media", () => {
    it("supports staged video finalize then attach to review", async () => {
        const store = new MemoryReviewsStore();
        const upload = await store.createMediaUpload({
            ownerUserId: "u1",
            mediaType: "video",
            fileName: "clip.mp4",
            mimeType: "video/mp4",
            fileSizeBytes: 1024 * 1024,
            durationMs: 25_000,
            width: 1280,
            height: 720
        });
        expect(upload.status).toBe("pending");
        const finalized = await store.finalizeMediaUpload({
            uploadId: upload.id,
            ownerUserId: "u1",
            checksum: "abc"
        });
        expect(finalized.status).toBe("uploaded");
        const review = await store.createOrReplace({
            placeId: "p1",
            authorUserId: "u1",
            authorProfileType: "PERSONAL",
            authorProfileId: "u1",
            authorDisplayName: "U1",
            body: "great",
            mediaUploadIds: [upload.id],
            editWindowMinutes: 30
        });
        expect(review.media).toHaveLength(1);
        expect(review.media[0]).toMatchObject({
            mediaType: "video",
            processingState: "ready",
            playbackUrl: expect.stringContaining("/playback"),
            posterUrl: expect.stringContaining("/poster")
        });
    });
    it("rejects attaching non-finalized video uploads", async () => {
        const store = new MemoryReviewsStore();
        const upload = await store.createMediaUpload({
            ownerUserId: "u1",
            mediaType: "video",
            fileName: "clip.mp4",
            mimeType: "video/mp4",
            fileSizeBytes: 1024 * 1024,
            durationMs: 25_000,
            width: 1280,
            height: 720
        });
        await expect(store.createOrReplace({
            placeId: "p1",
            authorUserId: "u1",
            authorProfileType: "PERSONAL",
            authorProfileId: "u1",
            authorDisplayName: "U1",
            body: "great",
            mediaUploadIds: [upload.id],
            editWindowMinutes: 30
        })).rejects.toThrow(/Validation failed/i);
    });
    it("supports moderated business review responses with revisions and public visibility rules", async () => {
        const store = new MemoryReviewsStore();
        const review = await store.createOrReplace({
            placeId: "p2",
            authorUserId: "reviewer-1",
            authorProfileType: "PERSONAL",
            authorProfileId: "reviewer-1",
            authorDisplayName: "Reviewer",
            body: "solid spot",
            editWindowMinutes: 30
        });
        const pending = await store.createOrUpdateBusinessReviewResponse({
            reviewId: review.id,
            placeId: "p2",
            businessProfileId: "biz-1",
            ownershipLinkId: "own-1",
            authoredByUserId: "owner-1",
            content: "Thanks for visiting.",
            moderationRequired: true
        });
        expect(pending.status).toBe("pending");
        const publicBefore = await store.getById(review.id);
        expect(publicBefore?.businessResponse).toBeUndefined();
        const published = await store.moderateBusinessReviewResponse({
            responseId: pending.id,
            action: "approved",
            actedByUserId: "mod-1"
        });
        expect(published.status).toBe("published");
        const edited = await store.createOrUpdateBusinessReviewResponse({
            reviewId: review.id,
            placeId: "p2",
            businessProfileId: "biz-1",
            ownershipLinkId: "own-1",
            authoredByUserId: "owner-1",
            content: "Thanks for visiting again.",
            moderationRequired: true
        });
        expect(edited.lastRevisionNumber).toBe(2);
        const revisions = await store.listBusinessReviewResponseRevisions(pending.id);
        expect(revisions).toHaveLength(2);
        await store.moderateBusinessReviewResponse({ responseId: pending.id, action: "approved", actedByUserId: "mod-1" });
        const publicAfter = await store.getById(review.id);
        expect(publicAfter?.businessResponse?.content).toContain("again");
        const notifications = await store.listBusinessResponseNotifications();
        expect(notifications.some((n) => n.type === "reviewer_notified_of_business_response" && n.userId === "reviewer-1")).toBe(true);
    });
});
