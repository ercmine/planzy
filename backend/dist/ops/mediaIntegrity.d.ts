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
export declare function detectMediaAnomalies(records: MediaRecord[]): MediaAnomaly[];
