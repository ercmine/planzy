import type {
  CanonicalPlace,
  DuplicateCandidate,
  DuplicateCandidateStatus,
  PlaceAttachmentLink,
  PlaceMaintenanceAuditEntry,
  PlaceSourceRecord,
  PlaceStore
} from "./types.js";

export class InMemoryPlaceStore implements PlaceStore {
  private readonly canonicalById = new Map<string, CanonicalPlace>();
  private readonly sourceByProviderRef = new Map<string, PlaceSourceRecord>();
  private readonly sourceById = new Map<string, PlaceSourceRecord>();
  private readonly duplicateCandidates = new Map<string, DuplicateCandidate>();
  private readonly maintenanceAudit = new Map<string, PlaceMaintenanceAuditEntry>();
  private readonly attachmentLinks = new Map<string, PlaceAttachmentLink>();

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

  upsertDuplicateCandidate(candidate: DuplicateCandidate): DuplicateCandidate {
    this.duplicateCandidates.set(candidate.id, candidate);
    return candidate;
  }

  listDuplicateCandidates(status?: DuplicateCandidateStatus): DuplicateCandidate[] {
    const all = [...this.duplicateCandidates.values()];
    return status ? all.filter((item) => item.status === status) : all;
  }

  getDuplicateCandidate(candidateId: string): DuplicateCandidate | undefined {
    return this.duplicateCandidates.get(candidateId);
  }

  upsertMaintenanceAudit(entry: PlaceMaintenanceAuditEntry): PlaceMaintenanceAuditEntry {
    this.maintenanceAudit.set(entry.id, entry);
    return entry;
  }

  listMaintenanceAudits(placeId?: string): PlaceMaintenanceAuditEntry[] {
    const all = [...this.maintenanceAudit.values()];
    if (!placeId) return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return all.filter((item) => item.targetPlaceId === placeId || item.sourcePlaceIds?.includes(placeId));
  }

  upsertAttachmentLink(link: PlaceAttachmentLink): PlaceAttachmentLink {
    this.attachmentLinks.set(link.id, link);
    return link;
  }

  listAttachmentLinks(placeId: string): PlaceAttachmentLink[] {
    return [...this.attachmentLinks.values()].filter((item) => item.placeId === placeId);
  }

  removeAttachmentLink(linkId: string): void {
    this.attachmentLinks.delete(linkId);
  }
}
