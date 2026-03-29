import type { SavedList, SavedListItem, SavedPlace } from "./types.js";
export interface SavedStore {
    listSavedPlaces(userId: string): Promise<SavedPlace[]>;
    upsertSavedPlace(input: SavedPlace): Promise<SavedPlace>;
    deleteSavedPlace(userId: string, placeId: string): Promise<void>;
    countSavedPlaces(userId: string): Promise<number>;
    createList(input: Omit<SavedList, "id" | "createdAt" | "updatedAt" | "itemCount">): Promise<SavedList>;
    updateList(list: SavedList): Promise<SavedList>;
    getList(listId: string): Promise<SavedList | undefined>;
    listListsByOwner(ownerUserId: string): Promise<SavedList[]>;
    listPublicListsByOwner(ownerUserId: string): Promise<SavedList[]>;
    listItems(listId: string): Promise<SavedListItem[]>;
    hasListItem(listId: string, placeId: string): Promise<boolean>;
    upsertListItem(item: Omit<SavedListItem, "position">): Promise<SavedListItem>;
    deleteListItem(listId: string, placeId: string): Promise<void>;
}
export declare class MemorySavedStore implements SavedStore {
    private readonly savedPlaces;
    private readonly lists;
    private readonly listItemsMap;
    listSavedPlaces(userId: string): Promise<SavedPlace[]>;
    upsertSavedPlace(input: SavedPlace): Promise<SavedPlace>;
    deleteSavedPlace(userId: string, placeId: string): Promise<void>;
    countSavedPlaces(userId: string): Promise<number>;
    createList(input: Omit<SavedList, "id" | "createdAt" | "updatedAt" | "itemCount">): Promise<SavedList>;
    updateList(list: SavedList): Promise<SavedList>;
    getList(listId: string): Promise<SavedList | undefined>;
    listListsByOwner(ownerUserId: string): Promise<SavedList[]>;
    listPublicListsByOwner(ownerUserId: string): Promise<SavedList[]>;
    listItems(listId: string): Promise<SavedListItem[]>;
    hasListItem(listId: string, placeId: string): Promise<boolean>;
    upsertListItem(item: Omit<SavedListItem, "position">): Promise<SavedListItem>;
    deleteListItem(listId: string, placeId: string): Promise<void>;
    private listItemsForList;
}
