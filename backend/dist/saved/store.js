import { randomUUID } from "node:crypto";
export class MemorySavedStore {
    savedPlaces = new Map();
    lists = new Map();
    listItemsMap = new Map();
    async listSavedPlaces(userId) {
        return [...this.savedPlaces.values()].filter((row) => row.userId === userId);
    }
    async upsertSavedPlace(input) {
        const key = `${input.userId}:${input.placeId}`;
        const existing = this.savedPlaces.get(key);
        if (existing) {
            return existing;
        }
        this.savedPlaces.set(key, input);
        return input;
    }
    async deleteSavedPlace(userId, placeId) {
        this.savedPlaces.delete(`${userId}:${placeId}`);
    }
    async countSavedPlaces(userId) {
        let count = 0;
        for (const row of this.savedPlaces.values()) {
            if (row.userId === userId)
                count += 1;
        }
        return count;
    }
    async createList(input) {
        const now = new Date().toISOString();
        const list = {
            ...input,
            id: `lst_${randomUUID()}`,
            itemCount: 0,
            createdAt: now,
            updatedAt: now
        };
        this.lists.set(list.id, list);
        return list;
    }
    async updateList(list) {
        this.lists.set(list.id, list);
        return list;
    }
    async getList(listId) {
        return this.lists.get(listId);
    }
    async listListsByOwner(ownerUserId) {
        return [...this.lists.values()].filter((item) => item.ownerUserId === ownerUserId && item.status !== "deleted");
    }
    async listPublicListsByOwner(ownerUserId) {
        return [...this.lists.values()].filter((item) => item.ownerUserId === ownerUserId && item.visibility === "public" && item.status === "active");
    }
    async listItems(listId) {
        return [...this.listItemsMap.values()].filter((item) => item.listId === listId);
    }
    async hasListItem(listId, placeId) {
        return this.listItemsMap.has(`${listId}:${placeId}`);
    }
    async upsertListItem(item) {
        const key = `${item.listId}:${item.placeId}`;
        const existing = this.listItemsMap.get(key);
        if (existing)
            return existing;
        const currentItems = await this.listItemsForList(item.listId);
        const row = { ...item, position: currentItems.length };
        this.listItemsMap.set(key, row);
        return row;
    }
    async deleteListItem(listId, placeId) {
        this.listItemsMap.delete(`${listId}:${placeId}`);
    }
    async listItemsForList(listId) {
        return [...this.listItemsMap.values()].filter((item) => item.listId === listId);
    }
}
