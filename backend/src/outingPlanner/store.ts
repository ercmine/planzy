import { randomUUID } from "node:crypto";

import type { GeneratedItinerary, SavedItinerary, SavedItineraryRevision } from "./types.js";

export interface OutingPlannerStore {
  createSavedItinerary(input: Omit<SavedItinerary, "id" | "createdAt" | "updatedAt">): Promise<SavedItinerary>;
  updateSavedItinerary(itinerary: SavedItinerary): Promise<void>;
  getSavedItinerary(id: string): Promise<SavedItinerary | undefined>;
  listSavedItinerariesByUser(userId: string): Promise<SavedItinerary[]>;
  deleteSavedItinerary(id: string): Promise<void>;

  addRevision(input: Omit<SavedItineraryRevision, "id" | "createdAt">): Promise<SavedItineraryRevision>;
  listRevisions(itineraryId: string): Promise<SavedItineraryRevision[]>;
  getRevision(id: string): Promise<SavedItineraryRevision | undefined>;
}

export class MemoryOutingPlannerStore implements OutingPlannerStore {
  private readonly itineraries = new Map<string, SavedItinerary>();
  private readonly revisions = new Map<string, SavedItineraryRevision>();

  async createSavedItinerary(input: Omit<SavedItinerary, "id" | "createdAt" | "updatedAt">): Promise<SavedItinerary> {
    const now = new Date().toISOString();
    const row: SavedItinerary = { ...input, id: `itn_${randomUUID()}`, createdAt: now, updatedAt: now };
    this.itineraries.set(row.id, row);
    return row;
  }

  async updateSavedItinerary(itinerary: SavedItinerary): Promise<void> {
    this.itineraries.set(itinerary.id, { ...itinerary, updatedAt: new Date().toISOString() });
  }

  async getSavedItinerary(id: string): Promise<SavedItinerary | undefined> {
    return this.itineraries.get(id);
  }

  async listSavedItinerariesByUser(userId: string): Promise<SavedItinerary[]> {
    return [...this.itineraries.values()].filter((row) => row.ownerUserId === userId && !row.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async deleteSavedItinerary(id: string): Promise<void> {
    this.itineraries.delete(id);
    for (const [key, revision] of this.revisions.entries()) {
      if (revision.itineraryId === id) this.revisions.delete(key);
    }
  }

  async addRevision(input: Omit<SavedItineraryRevision, "id" | "createdAt">): Promise<SavedItineraryRevision> {
    const row: SavedItineraryRevision = { ...input, id: `itr_${randomUUID()}`, createdAt: new Date().toISOString() };
    this.revisions.set(row.id, row);
    return row;
  }

  async listRevisions(itineraryId: string): Promise<SavedItineraryRevision[]> {
    return [...this.revisions.values()].filter((row) => row.itineraryId === itineraryId).sort((a, b) => a.revisionNumber - b.revisionNumber);
  }

  async getRevision(id: string): Promise<SavedItineraryRevision | undefined> {
    return this.revisions.get(id);
  }
}

export function cloneItinerary(itinerary: GeneratedItinerary): GeneratedItinerary {
  return JSON.parse(JSON.stringify(itinerary)) as GeneratedItinerary;
}
