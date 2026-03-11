import { describe, expect, it } from "vitest";

import { MemoryVideoPlatformStore } from "../store.js";
import { VideoPlatformService } from "../service.js";

function createService() {
  return new VideoPlatformService(
    new MemoryVideoPlatformStore(),
    { exists: (placeId) => placeId === "place_1" },
    {
      awsRegion: "us-east-1",
      rawBucket: "raw-bucket",
      processedBucket: "processed-bucket",
      cloudFrontBaseUrl: "https://cdn.perbug.com",
      uploadTtlSeconds: 900,
      maxUploadBytes: 1024 * 1024 * 1024,
      multipartThresholdBytes: 10 * 1024 * 1024
    }
  );
}

describe("VideoPlatformService", () => {
  it("creates draft, upload session, finalizes upload and publishes", async () => {
    const service = createService();

    const draft = await service.createDraft({
      userId: "user_1",
      canonicalPlaceId: "place_1",
      title: "Great sushi",
      caption: "Loved it",
      rating: 5
    });

    const upload = await service.requestUploadSession({
      userId: "user_1",
      videoId: draft.id,
      fileName: "review.mp4",
      contentType: "video/mp4",
      sizeBytes: 30 * 1024 * 1024
    });

    expect(upload.uploadMode).toBe("multipart");
    expect(upload.parts?.length).toBeGreaterThan(1);

    const uploaded = await service.finalizeUpload({
      userId: "user_1",
      videoId: draft.id,
      uploadSessionId: upload.id,
      durationMs: 15000,
      width: 1080,
      height: 1920
    });

    expect(uploaded.status).toBe("uploaded");
    expect(uploaded.originalAssetKey).toContain(`/${draft.id}/`);

    const published = await service.publish({ userId: "user_1", videoId: draft.id });
    expect(published.status).toBe("published");

    const feed = await service.listFeed({ limit: 10 });
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]?.playbackUrl).toBe(`https://cdn.perbug.com/processed/place-review-videos/${draft.id}/playback.mp4`);
  });
});
