import { describe, expect, it } from "vitest";

import { dedupeAndRankPhotos, normalizeProviderPhoto, selectBestPhotoUrl } from "../photoGallery.js";

describe("photo gallery normalization", () => {
  it("normalizes provider photos with source metadata", () => {
    const normalized = normalizeProviderPhoto({
      sourceRecordId: "src_1",
      provider: "google_places",
      index: 0,
      photo: {
        providerPhotoRef: "places/abc/photos/1",
        width: 1600,
        height: 900,
        attributionText: "Google"
      }
    });

    expect(normalized.sourceProvider).toBe("google_places");
    expect(normalized.sourceType).toBe("provider");
    expect(normalized.qualityScore).toBe(1440000);
  });

  it("dedupes obvious duplicates and keeps better quality", () => {
    const photos = dedupeAndRankPhotos([
      normalizeProviderPhoto({
        sourceRecordId: "src_a",
        provider: "google_places",
        index: 0,
        photo: {
          providerPhotoRef: "same",
          url: "https://img.example.com/photo.jpg?w=200",
          width: 200,
          height: 120,
          isPrimary: true
        }
      }),
      normalizeProviderPhoto({
        sourceRecordId: "src_b",
        provider: "google_places",
        index: 1,
        photo: {
          providerPhotoRef: "same",
          url: "https://img.example.com/photo.jpg?w=1200",
          width: 1200,
          height: 900
        }
      })
    ]);

    expect(photos).toHaveLength(1);
    expect(photos[0]?.width).toBe(1200);
    expect(photos[0]?.isPrimary).toBe(true);
  });

  it("prefers thumbnail and full urls based on requested size", () => {
    const photo = normalizeProviderPhoto({
      sourceRecordId: "src_2",
      provider: "foursquare",
      index: 0,
      photo: {
        thumbnailUrl: "https://img/thumb.jpg",
        mediumUrl: "https://img/medium.jpg",
        fullUrl: "https://img/full.jpg"
      }
    });

    expect(selectBestPhotoUrl(photo, "thumbnail")).toBe("https://img/thumb.jpg");
    expect(selectBestPhotoUrl(photo, "full")).toBe("https://img/full.jpg");
  });
});
