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
});
