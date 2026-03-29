export class InMemoryPlaceStore {
    canonicalById = new Map();
    sourceByProviderRef = new Map();
    sourceById = new Map();
    duplicateCandidates = new Map();
    maintenanceAudit = new Map();
    attachmentLinks = new Map();
    getSourceRecordByProviderRef(provider, providerPlaceId) {
        return this.sourceByProviderRef.get(`${provider}:${providerPlaceId}`);
    }
    upsertSourceRecord(record) {
        this.sourceByProviderRef.set(`${record.provider}:${record.providerPlaceId}`, record);
        this.sourceById.set(record.sourceRecordId, record);
        return record;
    }
    getCanonicalPlace(placeId) {
        return this.canonicalById.get(placeId);
    }
    upsertCanonicalPlace(place) {
        this.canonicalById.set(place.canonicalPlaceId, place);
        return place;
    }
    listCanonicalPlaces() {
        return [...this.canonicalById.values()];
    }
    listSourceRecordsForPlace(canonicalPlaceId) {
        return [...this.sourceById.values()].filter((record) => record.canonicalPlaceId === canonicalPlaceId);
    }
    listSourceRecords() {
        return [...this.sourceById.values()];
    }
    upsertDuplicateCandidate(candidate) {
        this.duplicateCandidates.set(candidate.id, candidate);
        return candidate;
    }
    listDuplicateCandidates(status) {
        const all = [...this.duplicateCandidates.values()];
        return status ? all.filter((item) => item.status === status) : all;
    }
    getDuplicateCandidate(candidateId) {
        return this.duplicateCandidates.get(candidateId);
    }
    upsertMaintenanceAudit(entry) {
        this.maintenanceAudit.set(entry.id, entry);
        return entry;
    }
    listMaintenanceAudits(placeId) {
        const all = [...this.maintenanceAudit.values()];
        if (!placeId)
            return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return all.filter((item) => item.targetPlaceId === placeId || item.sourcePlaceIds?.includes(placeId));
    }
    upsertAttachmentLink(link) {
        this.attachmentLinks.set(link.id, link);
        return link;
    }
    listAttachmentLinks(placeId) {
        return [...this.attachmentLinks.values()].filter((item) => item.placeId === placeId);
    }
    removeAttachmentLink(linkId) {
        this.attachmentLinks.delete(linkId);
    }
}
