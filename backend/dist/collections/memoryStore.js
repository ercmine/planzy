export class MemoryCollectionStore {
    places;
    definitions = new Map();
    progress = new Map();
    processedEvents = new Set();
    constructor(places = [], seedDefinitions = []) {
        this.places = places;
        for (const item of seedDefinitions)
            this.definitions.set(item.id, item);
    }
    listDefinitions() { return [...this.definitions.values()]; }
    saveDefinition(definition) { this.definitions.set(definition.id, definition); }
    getDefinition(id) { return this.definitions.get(id) ?? null; }
    listPlaceSnapshots() { return this.places; }
    getProgress(userId, collectionId) { return this.progress.get(`${userId}:${collectionId}`) ?? null; }
    saveProgress(progress) { this.progress.set(`${progress.userId}:${progress.collectionId}`, progress); }
    hasProcessedEvent(eventId) { return this.processedEvents.has(eventId); }
    markProcessedEvent(eventId) { this.processedEvents.add(eventId); }
}
