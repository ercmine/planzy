import { getProviderAdapter } from "./adapters.js";
import { findPlaceMatch } from "./matcher.js";
import { mergeIntoCanonicalPlace } from "./merge.js";
import { stableHash } from "./normalization.js";
import type {
  ImportProviderPlaceInput,
  ImportProviderPlaceResult,
  MatchResult,
  NormalizedProviderPlace,
  PlaceSourceRecord,
  PlaceStore
} from "./types.js";

function nowIso(): string {
  return new Date().toISOString();
}

export class PlaceNormalizationService {
  constructor(public readonly store: PlaceStore) {}

  normalizeProviderPlace(provider: string, rawPayload: unknown, sourceUrl?: string): NormalizedProviderPlace {
    return getProviderAdapter(provider).normalizeProviderPlace(rawPayload, { sourceUrl });
  }

  findPlaceMatch(normalizedProviderPlace: NormalizedProviderPlace): MatchResult {
    return findPlaceMatch(normalizedProviderPlace, this.store.listCanonicalPlaces());
  }

  getCanonicalPlace(placeId: string) {
    return this.store.getCanonicalPlace(placeId);
  }

  getCanonicalPlaceByProviderRef(provider: string, providerPlaceId: string) {
    const sourceRecord = this.store.getSourceRecordByProviderRef(provider, providerPlaceId);
    if (!sourceRecord?.canonicalPlaceId) {
      return undefined;
    }
    return this.store.getCanonicalPlace(sourceRecord.canonicalPlaceId);
  }

  importProviderPlace(input: ImportProviderPlaceInput): ImportProviderPlaceResult {
    const normalized = this.normalizeProviderPlace(input.provider, input.rawPayload, input.sourceUrl);
    const existingSource = this.store.getSourceRecordByProviderRef(normalized.provider, normalized.providerPlaceId);
    const payloadHash = stableHash(input.rawPayload);

    if (existingSource && existingSource.rawPayloadHash === payloadHash) {
      return {
        status: "unchanged",
        canonicalPlaceId: existingSource.canonicalPlaceId ?? "",
        sourceRecordId: existingSource.sourceRecordId,
        match: {
          outcome: "exact_linked_match",
          canonicalPlaceId: existingSource.canonicalPlaceId,
          score: 1,
          reasons: [{ signal: "payload_hash", weight: 1, score: 1, detail: "raw payload hash unchanged" }]
        },
        mergeSummary: { changedFields: [], created: false, updated: false, unchanged: true }
      };
    }

    const match = this.findPlaceMatch(normalized);
    const sourceRecordId = existingSource?.sourceRecordId ?? `src_${stableHash([normalized.provider, normalized.providerPlaceId]).slice(0, 16)}`;
    const sourceRecord: PlaceSourceRecord = {
      sourceRecordId,
      provider: normalized.provider,
      providerPlaceId: normalized.providerPlaceId,
      canonicalPlaceId: existingSource?.canonicalPlaceId ?? match.canonicalPlaceId,
      rawPayload: input.rawPayload,
      rawPayloadHash: payloadHash,
      normalizedPayload: normalized,
      fetchTimestamp: input.fetchedAt ?? nowIso(),
      sourceUrl: normalized.sourceUrl,
      sourceConfidence: match.outcome === "no_match" ? 0.5 : 0.9,
      importBatchId: input.importBatchId,
      syncRunId: input.syncRunId,
      version: (existingSource?.version ?? 0) + 1
    };

    const existingPlace = match.canonicalPlaceId ? this.store.getCanonicalPlace(match.canonicalPlaceId) : undefined;
    const merged = mergeIntoCanonicalPlace({ existingPlace, match, normalized, sourceRecord });
    sourceRecord.canonicalPlaceId = merged.place.canonicalPlaceId;
    this.store.upsertCanonicalPlace(merged.place);
    this.store.upsertSourceRecord(sourceRecord);

    return {
      status: existingSource ? "updated" : "created",
      canonicalPlaceId: merged.place.canonicalPlaceId,
      sourceRecordId: sourceRecord.sourceRecordId,
      match,
      mergeSummary: merged.summary
    };
  }

  listCanonicalPlaces() {
    return this.store.listCanonicalPlaces();
  }

  listSourceRecords() {
    return this.store.listSourceRecords();
  }

  listSourceRecordsForPlace(placeId: string) {
    return this.store.listSourceRecordsForPlace(placeId);
  }

  rebuildCanonicalPlace(placeId: string) {
    const sourceRecords = this.store.listSourceRecordsForPlace(placeId);
    if (sourceRecords.length === 0) {
      return undefined;
    }

    let place = undefined;
    for (const sourceRecord of sourceRecords) {
      const match: MatchResult = {
        outcome: place ? "confident_auto_merge" : "no_match",
        canonicalPlaceId: place?.canonicalPlaceId,
        score: place ? 0.8 : 0,
        reasons: []
      };
      place = mergeIntoCanonicalPlace({
        existingPlace: place,
        match,
        normalized: sourceRecord.normalizedPayload,
        sourceRecord
      }).place;
    }

    if (!place) {
      return undefined;
    }

    this.store.upsertCanonicalPlace(place);
    return place;
  }

  reprocessSourceRecord(sourceRecordId: string) {
    const sourceRecord = this.store.listSourceRecords().find((entry) => entry.sourceRecordId === sourceRecordId);
    if (!sourceRecord) {
      return undefined;
    }

    return this.importProviderPlace({
      provider: sourceRecord.provider,
      rawPayload: sourceRecord.rawPayload,
      sourceUrl: sourceRecord.sourceUrl,
      fetchedAt: sourceRecord.fetchTimestamp
    });
  }
}
