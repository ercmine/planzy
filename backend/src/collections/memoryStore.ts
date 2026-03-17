import type { CanonicalPlaceSnapshot, CollectionDefinition, CollectionProgress, CollectionStore } from "./types.js";

export class MemoryCollectionStore implements CollectionStore {
  private readonly definitions = new Map<string, CollectionDefinition>();
  private readonly progress = new Map<string, CollectionProgress>();
  private readonly processedEvents = new Set<string>();

  constructor(private readonly places: CanonicalPlaceSnapshot[] = [], seedDefinitions: CollectionDefinition[] = []) {
    for (const item of seedDefinitions) this.definitions.set(item.id, item);
  }

  listDefinitions(): CollectionDefinition[] { return [...this.definitions.values()]; }
  saveDefinition(definition: CollectionDefinition): void { this.definitions.set(definition.id, definition); }
  getDefinition(id: string): CollectionDefinition | null { return this.definitions.get(id) ?? null; }
  listPlaceSnapshots(): CanonicalPlaceSnapshot[] { return this.places; }
  getProgress(userId: string, collectionId: string): CollectionProgress | null { return this.progress.get(`${userId}:${collectionId}`) ?? null; }
  saveProgress(progress: CollectionProgress): void { this.progress.set(`${progress.userId}:${progress.collectionId}`, progress); }
  hasProcessedEvent(eventId: string): boolean { return this.processedEvents.has(eventId); }
  markProcessedEvent(eventId: string): void { this.processedEvents.add(eventId); }
}
