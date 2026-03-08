import type { CanonicalPlace, PlaceSourceRecord, PlaceStore } from "./types.js";

export class InMemoryPlaceStore implements PlaceStore {
  private readonly canonicalById = new Map<string, CanonicalPlace>();
  private readonly sourceByProviderRef = new Map<string, PlaceSourceRecord>();
  private readonly sourceById = new Map<string, PlaceSourceRecord>();

  getSourceRecordByProviderRef(provider: string, providerPlaceId: string): PlaceSourceRecord | undefined {
    return this.sourceByProviderRef.get(`${provider}:${providerPlaceId}`);
  }

  upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord {
    this.sourceByProviderRef.set(`${record.provider}:${record.providerPlaceId}`, record);
    this.sourceById.set(record.sourceRecordId, record);
    return record;
  }

  getCanonicalPlace(placeId: string): CanonicalPlace | undefined {
    return this.canonicalById.get(placeId);
  }

  upsertCanonicalPlace(place: CanonicalPlace): CanonicalPlace {
    this.canonicalById.set(place.canonicalPlaceId, place);
    return place;
  }

  listCanonicalPlaces(): CanonicalPlace[] {
    return [...this.canonicalById.values()];
  }

  listSourceRecordsForPlace(canonicalPlaceId: string): PlaceSourceRecord[] {
    return [...this.sourceById.values()].filter((record) => record.canonicalPlaceId === canonicalPlaceId);
  }

  listSourceRecords(): PlaceSourceRecord[] {
    return [...this.sourceById.values()];
  }
}
