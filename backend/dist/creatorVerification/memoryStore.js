export class MemoryCreatorVerificationStore {
    applications = new Map();
    audits = new Map();
    saveApplication(application) {
        this.applications.set(application.id, application);
    }
    getApplicationById(id) {
        return this.applications.get(id);
    }
    getLatestForCreator(creatorProfileId) {
        return [...this.applications.values()]
            .filter((row) => row.creatorProfileId === creatorProfileId)
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    }
    listApplications(filter) {
        return [...this.applications.values()]
            .filter((row) => (!filter?.status || row.status === filter.status) && (!filter?.creatorProfileId || row.creatorProfileId === filter.creatorProfileId) && (!filter?.userId || row.userId === filter.userId))
            .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));
    }
    listActiveApplicationsByCreator(creatorProfileId) {
        return [...this.applications.values()].filter((row) => row.creatorProfileId === creatorProfileId && ["draft", "submitted", "under_review", "needs_more_info"].includes(row.status));
    }
    saveAuditEvent(event) {
        this.audits.set(event.applicationId, [...(this.audits.get(event.applicationId) ?? []), event]);
    }
    listAuditEvents(applicationId) {
        return this.audits.get(applicationId) ?? [];
    }
}
