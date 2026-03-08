import { randomUUID } from "node:crypto";

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

export class MemorySavedStore implements SavedStore {
  private readonly savedPlaces = new Map<string, SavedPlace>();
  private readonly lists = new Map<string, SavedList>();
  private readonly listItemsMap = new Map<string, SavedListItem>();

  async listSavedPlaces(userId: string): Promise<SavedPlace[]> {
    return [...this.savedPlaces.values()].filter((row) => row.userId === userId);
  }

  async upsertSavedPlace(input: SavedPlace): Promise<SavedPlace> {
    const key = `${input.userId}:${input.placeId}`;
    const existing = this.savedPlaces.get(key);
    if (existing) {
      return existing;
    }
    this.savedPlaces.set(key, input);
    return input;
  }

  async deleteSavedPlace(userId: string, placeId: string): Promise<void> {
    this.savedPlaces.delete(`${userId}:${placeId}`);
  }

  async countSavedPlaces(userId: string): Promise<number> {
    let count = 0;
    for (const row of this.savedPlaces.values()) {
      if (row.userId === userId) count += 1;
    }
    return count;
  }

  async createList(input: Omit<SavedList, "id" | "createdAt" | "updatedAt" | "itemCount">): Promise<SavedList> {
    const now = new Date().toISOString();
    const list: SavedList = {
      ...input,
      id: `lst_${randomUUID()}`,
      itemCount: 0,
      createdAt: now,
      updatedAt: now
    };
    this.lists.set(list.id, list);
    return list;
  }

  async updateList(list: SavedList): Promise<SavedList> {
    this.lists.set(list.id, list);
    return list;
  }

  async getList(listId: string): Promise<SavedList | undefined> {
    return this.lists.get(listId);
  }

  async listListsByOwner(ownerUserId: string): Promise<SavedList[]> {
    return [...this.lists.values()].filter((item) => item.ownerUserId === ownerUserId && item.status !== "deleted");
  }

  async listPublicListsByOwner(ownerUserId: string): Promise<SavedList[]> {
    return [...this.lists.values()].filter((item) => item.ownerUserId === ownerUserId && item.visibility === "public" && item.status === "active");
  }

  async listItems(listId: string): Promise<SavedListItem[]> {
    return [...this.listItemsMap.values()].filter((item) => item.listId === listId);
  }

  async hasListItem(listId: string, placeId: string): Promise<boolean> {
    return this.listItemsMap.has(`${listId}:${placeId}`);
  }

  async upsertListItem(item: Omit<SavedListItem, "position">): Promise<SavedListItem> {
    const key = `${item.listId}:${item.placeId}`;
    const existing = this.listItemsMap.get(key);
    if (existing) return existing;

    const currentItems = await this.listItemsForList(item.listId);
    const row: SavedListItem = { ...item, position: currentItems.length };
    this.listItemsMap.set(key, row);
    return row;
  }

  async deleteListItem(listId: string, placeId: string): Promise<void> {
    this.listItemsMap.delete(`${listId}:${placeId}`);
  }

  private async listItemsForList(listId: string): Promise<SavedListItem[]> {
    return [...this.listItemsMap.values()].filter((item) => item.listId === listId);
  }
}
