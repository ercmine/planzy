import { randomUUID } from "node:crypto";
export class MemoryOutingPlannerStore {
    itineraries = new Map();
    revisions = new Map();
    async createSavedItinerary(input) {
        const now = new Date().toISOString();
        const row = { ...input, id: `itn_${randomUUID()}`, createdAt: now, updatedAt: now };
        this.itineraries.set(row.id, row);
        return row;
    }
    async updateSavedItinerary(itinerary) {
        this.itineraries.set(itinerary.id, { ...itinerary, updatedAt: new Date().toISOString() });
    }
    async getSavedItinerary(id) {
        return this.itineraries.get(id);
    }
    async listSavedItinerariesByUser(userId) {
        return [...this.itineraries.values()].filter((row) => row.ownerUserId === userId && !row.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }
    async deleteSavedItinerary(id) {
        this.itineraries.delete(id);
        for (const [key, revision] of this.revisions.entries()) {
            if (revision.itineraryId === id)
                this.revisions.delete(key);
        }
    }
    async addRevision(input) {
        const row = { ...input, id: `itr_${randomUUID()}`, createdAt: new Date().toISOString() };
        this.revisions.set(row.id, row);
        return row;
    }
    async listRevisions(itineraryId) {
        return [...this.revisions.values()].filter((row) => row.itineraryId === itineraryId).sort((a, b) => a.revisionNumber - b.revisionNumber);
    }
    async getRevision(id) {
        return this.revisions.get(id);
    }
}
export function cloneItinerary(itinerary) {
    return JSON.parse(JSON.stringify(itinerary));
}
