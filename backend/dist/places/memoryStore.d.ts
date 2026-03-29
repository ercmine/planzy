import type { CanonicalPlace, DuplicateCandidate, DuplicateCandidateStatus, PlaceAttachmentLink, PlaceMaintenanceAuditEntry, PlaceSourceRecord, PlaceStore } from "./types.js";
export declare class InMemoryPlaceStore implements PlaceStore {
    private readonly canonicalById;
    private readonly sourceByProviderRef;
    private readonly sourceById;
    private readonly duplicateCandidates;
    private readonly maintenanceAudit;
    private readonly attachmentLinks;
    getSourceRecordByProviderRef(provider: string, providerPlaceId: string): PlaceSourceRecord | undefined;
    upsertSourceRecord(record: PlaceSourceRecord): PlaceSourceRecord;
    getCanonicalPlace(placeId: string): CanonicalPlace | undefined;
    upsertCanonicalPlace(place: CanonicalPlace): CanonicalPlace;
    listCanonicalPlaces(): CanonicalPlace[];
    listSourceRecordsForPlace(canonicalPlaceId: string): PlaceSourceRecord[];
    listSourceRecords(): PlaceSourceRecord[];
    upsertDuplicateCandidate(candidate: DuplicateCandidate): DuplicateCandidate;
    listDuplicateCandidates(status?: DuplicateCandidateStatus): DuplicateCandidate[];
    getDuplicateCandidate(candidateId: string): DuplicateCandidate | undefined;
    upsertMaintenanceAudit(entry: PlaceMaintenanceAuditEntry): PlaceMaintenanceAuditEntry;
    listMaintenanceAudits(placeId?: string): PlaceMaintenanceAuditEntry[];
    upsertAttachmentLink(link: PlaceAttachmentLink): PlaceAttachmentLink;
    listAttachmentLinks(placeId: string): PlaceAttachmentLink[];
    removeAttachmentLink(linkId: string): void;
}
