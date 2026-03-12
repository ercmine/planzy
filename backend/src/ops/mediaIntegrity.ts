export interface MediaRecord {
  videoId: string;
  state: "draft" | "processing" | "processed" | "published" | "failed";
  processedAssetKey?: string;
  thumbnailKey?: string;
  linkedPlaceId?: string;
}

export interface MediaAnomaly {
  videoId: string;
  code: "missing_processed_asset" | "missing_thumbnail" | "published_without_place";
}

export function detectMediaAnomalies(records: MediaRecord[]): MediaAnomaly[] {
  const anomalies: MediaAnomaly[] = [];
  for (const record of records) {
    if (["processed", "published"].includes(record.state) && !record.processedAssetKey) {
      anomalies.push({ videoId: record.videoId, code: "missing_processed_asset" });
    }
    if (record.state === "published" && !record.thumbnailKey) {
      anomalies.push({ videoId: record.videoId, code: "missing_thumbnail" });
    }
    if (record.state === "published" && !record.linkedPlaceId) {
      anomalies.push({ videoId: record.videoId, code: "published_without_place" });
    }
  }
  return anomalies;
}
