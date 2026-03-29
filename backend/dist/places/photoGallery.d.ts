import type { CanonicalPhoto, NormalizedProviderPhoto } from "./types.js";
export declare function normalizeProviderPhoto(params: {
    placeId?: string;
    sourceRecordId: string;
    provider: string;
    photo: NormalizedProviderPhoto;
    index: number;
    fetchedAt?: string;
}): CanonicalPhoto;
export declare function dedupeAndRankPhotos(photos: CanonicalPhoto[]): CanonicalPhoto[];
export declare function selectBestPhotoUrl(photo: CanonicalPhoto, preferred?: "thumbnail" | "medium" | "full"): string | undefined;
