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
export declare class MemoryOutingPlannerStore implements OutingPlannerStore {
    private readonly itineraries;
    private readonly revisions;
    createSavedItinerary(input: Omit<SavedItinerary, "id" | "createdAt" | "updatedAt">): Promise<SavedItinerary>;
    updateSavedItinerary(itinerary: SavedItinerary): Promise<void>;
    getSavedItinerary(id: string): Promise<SavedItinerary | undefined>;
    listSavedItinerariesByUser(userId: string): Promise<SavedItinerary[]>;
    deleteSavedItinerary(id: string): Promise<void>;
    addRevision(input: Omit<SavedItineraryRevision, "id" | "createdAt">): Promise<SavedItineraryRevision>;
    listRevisions(itineraryId: string): Promise<SavedItineraryRevision[]>;
    getRevision(id: string): Promise<SavedItineraryRevision | undefined>;
}
export declare function cloneItinerary(itinerary: GeneratedItinerary): GeneratedItinerary;
