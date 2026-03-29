export function detectMediaAnomalies(records) {
    const anomalies = [];
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
