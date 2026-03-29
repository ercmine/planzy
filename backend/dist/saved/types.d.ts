import type { ProfileType } from "../accounts/types.js";
export type ListVisibility = "private" | "public";
export type ListStatus = "active" | "archived" | "deleted";
export interface SavedPlace {
    userId: string;
    placeId: string;
    savedAt: string;
    source?: string;
}
export interface SavedList {
    id: string;
    ownerUserId: string;
    ownerProfileType: ProfileType;
    ownerProfileId: string;
    title: string;
    slug: string;
    description?: string;
    visibility: ListVisibility;
    status: ListStatus;
    isDefault: boolean;
    itemCount: number;
    coverImageUrl?: string;
    createdAt: string;
    updatedAt: string;
}
export interface SavedListItem {
    listId: string;
    placeId: string;
    addedAt: string;
    addedBy: string;
    position: number;
}
