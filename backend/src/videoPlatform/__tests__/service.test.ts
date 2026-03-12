import { describe, expect, it } from "vitest";

import { MemoryVideoPlatformStore } from "../store.js";
import { VideoPlatformService, type UploadObjectVerifier, type VideoProcessingExecutor } from "../service.js";

function createService(deps?: { verifier?: UploadObjectVerifier; processor?: VideoProcessingExecutor; autoPublishAfterProcessing?: boolean }) {
  return new VideoPlatformService(
    new MemoryVideoPlatformStore(),
    { exists: (placeId) => placeId === "place_1" || placeId === "place_2" },
    {
      awsRegion: "us-east-1",
      rawBucket: "raw-bucket",
      processedBucket: "processed-bucket",
      cloudFrontBaseUrl: "https://cdn.perbug.com",
      uploadTtlSeconds: 900,
      maxUploadBytes: 1024 * 1024 * 1024,
      multipartThresholdBytes: 10 * 1024 * 1024,
      autoPublishAfterProcessing: deps?.autoPublishAfterProcessing ?? false
    },
    deps?.verifier,
    deps?.processor
  );
}

describe("VideoPlatformService lifecycle", () => {
  it("runs draft -> upload finalize -> processing -> moderation -> publish", async () => {
    const service = createService();

    const draft = await service.createDraft({ userId: "user_1", canonicalPlaceId: "place_1", title: "Great sushi" });
    const upload = await service.requestUploadSession({ userId: "user_1", videoId: draft.id, fileName: "review.mp4", contentType: "video/mp4", sizeBytes: 30 * 1024 * 1024 });

    const uploaded = await service.finalizeUpload({ userId: "user_1", videoId: draft.id, uploadSessionId: upload.id, durationMs: 15000, width: 1080, height: 1920 });
    expect(uploaded.status).toBe("processing_queued");

    const job = await service.processNextQueuedJob();
    expect(job?.status).toBe("succeeded");

    const studioPending = await service.listStudio("user_1");
    expect(studioPending[0]?.status).toBe("moderation_pending");

    await service.applyModeration({ videoId: draft.id, status: "approved" });
    await service.updateDraft({ userId: "user_1", videoId: draft.id, visibility: "public" });
    const published = await service.publish({ userId: "user_1", videoId: draft.id });

    expect(published.status).toBe("published");

    const feed = await service.listFeed({ scope: "local", limit: 10 });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.playbackUrl).toBe(`https://cdn.perbug.com/processed/place-review-videos/${draft.id}/playback.mp4`);
  });

  it("rejects invalid transition when publishing before processed", async () => {
    const service = createService();
    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "t" });
    await expect(service.publish({ userId: "u", videoId: draft.id })).rejects.toThrow("video_not_publish_ready");
  });

  it("handles upload verification failures and allows retry", async () => {
    const service = createService({ verifier: { verifyObjectExists: async () => false } });
    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "t" });
    const upload = await service.requestUploadSession({ userId: "u", videoId: draft.id, fileName: "review.mp4", contentType: "video/mp4", sizeBytes: 3 });

    await expect(service.finalizeUpload({ userId: "u", videoId: draft.id, uploadSessionId: upload.id })).rejects.toThrow("upload_object_missing");

    const studio = await service.listStudio("u");
    expect(studio[0]?.status).toBe("failed_upload");
    expect(studio[0]?.isRetryable).toBe(true);

    const retried = await service.retryUpload({ userId: "u", videoId: draft.id });
    expect(retried.status).toBe("awaiting_upload");
  });

  it("handles processing failure and supports retry to completion", async () => {
    let run = 0;
    const service = createService({
      processor: {
        async process({ video }) {
          run += 1;
          if (run === 1) throw new Error("ffmpeg_crash");
          return {
            processedAssetKey: `processed/place-review-videos/${video.id}/playback.mp4`,
            thumbnailAssetKey: `processed/place-review-videos/${video.id}/thumb.jpg`
          };
        }
      }
    });

    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "t" });
    const upload = await service.requestUploadSession({ userId: "u", videoId: draft.id, fileName: "review.mp4", contentType: "video/mp4", sizeBytes: 30 });
    await service.finalizeUpload({ userId: "u", videoId: draft.id, uploadSessionId: upload.id });

    const failed = await service.processNextQueuedJob();
    expect(failed?.status).toBe("failed");
    let studio = await service.listStudio("u");
    expect(studio[0]?.status).toBe("failed_processing");

    await service.retryProcessing({ userId: "u", videoId: draft.id });
    const succeeded = await service.processNextQueuedJob();
    expect(succeeded?.status).toBe("succeeded");
    studio = await service.listStudio("u");
    expect(["moderation_pending", "publish_pending"]).toContain(studio[0]?.status);
  });

  it("keeps non-published videos out of public lists", async () => {
    const service = createService();
    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "t" });
    const upload = await service.requestUploadSession({ userId: "u", videoId: draft.id, fileName: "review.mp4", contentType: "video/mp4", sizeBytes: 30 });
    await service.finalizeUpload({ userId: "u", videoId: draft.id, uploadSessionId: upload.id });
    await service.processNextQueuedJob();

    expect((await service.listFeed({ scope: "local", limit: 10 })).items).toHaveLength(0);
    expect((await service.listPlaceVideos("place_1")).length).toBe(0);
    expect((await service.listCreatorVideos("u")).length).toBe(0);
  });


  it("segments studio content and returns creator analytics", async () => {
    const service = createService();
    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "draft" });

    const pub = await service.createDraft({ userId: "u", canonicalPlaceId: "place_2", title: "published" });
    const upload = await service.requestUploadSession({ userId: "u", videoId: pub.id, fileName: "review.mp4", contentType: "video/mp4", sizeBytes: 30 });
    await service.finalizeUpload({ userId: "u", videoId: pub.id, uploadSessionId: upload.id });
    await service.processNextQueuedJob();
    await service.applyModeration({ videoId: pub.id, status: "approved" });
    await service.updateDraft({ userId: "u", videoId: pub.id, visibility: "public" });
    await service.publish({ userId: "u", videoId: pub.id });

    await service.recordVideoEvent({ videoId: pub.id, event: "video_viewed" });
    await service.recordVideoEvent({ videoId: pub.id, event: "video_saved" });

    const drafts = await service.listStudio("u", { section: "drafts" });
    const published = await service.listStudio("u", { section: "published" });
    expect(drafts.some((item) => item.videoId === draft.id)).toBe(true);
    expect(published.some((item) => item.videoId === pub.id)).toBe(true);

    const analytics = await service.getCreatorStudioAnalytics("u");
    expect(analytics.summary.totalVideosPublished).toBe(1);
    expect(analytics.summary.totalViews).toBe(1);
    expect(analytics.topPlaces[0]?.placeId).toBe("place_2");
  });

  it("archives drafts", async () => {
    const service = createService();
    const draft = await service.createDraft({ userId: "u", canonicalPlaceId: "place_1", title: "to archive" });
    const archived = await service.archiveVideo({ userId: "u", videoId: draft.id });
    expect(archived.status).toBe("archived");
    const rows = await service.listStudio("u", { section: "archived" });
    expect(rows[0]?.videoId).toBe(draft.id);
  });
});
