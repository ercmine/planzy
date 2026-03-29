import type { CanonicalPlaceSnapshot, CollectionDefinition, CollectionProgress, CollectionStore } from "./types.js";
export declare class MemoryCollectionStore implements CollectionStore {
    private readonly places;
    private readonly definitions;
    private readonly progress;
    private readonly processedEvents;
    constructor(places?: CanonicalPlaceSnapshot[], seedDefinitions?: CollectionDefinition[]);
    listDefinitions(): CollectionDefinition[];
    saveDefinition(definition: CollectionDefinition): void;
    getDefinition(id: string): CollectionDefinition | null;
    listPlaceSnapshots(): CanonicalPlaceSnapshot[];
    getProgress(userId: string, collectionId: string): CollectionProgress | null;
    saveProgress(progress: CollectionProgress): void;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
}
