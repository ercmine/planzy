import type { CreatorVerificationStore } from "./store.js";
import type { CreatorVerificationAdminListFilter, CreatorVerificationApplication, CreatorVerificationAuditEvent } from "./types.js";

export class MemoryCreatorVerificationStore implements CreatorVerificationStore {
  private readonly applications = new Map<string, CreatorVerificationApplication>();
  private readonly audits = new Map<string, CreatorVerificationAuditEvent[]>();

  saveApplication(application: CreatorVerificationApplication): void {
    this.applications.set(application.id, application);
  }

  getApplicationById(id: string): CreatorVerificationApplication | undefined {
    return this.applications.get(id);
  }

  getLatestForCreator(creatorProfileId: string): CreatorVerificationApplication | undefined {
    return [...this.applications.values()]
      .filter((row) => row.creatorProfileId === creatorProfileId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  listApplications(filter?: CreatorVerificationAdminListFilter): CreatorVerificationApplication[] {
    return [...this.applications.values()]
      .filter((row) => (!filter?.status || row.status === filter.status) && (!filter?.creatorProfileId || row.creatorProfileId === filter.creatorProfileId) && (!filter?.userId || row.userId === filter.userId))
      .sort((a, b) => (b.submittedAt ?? b.updatedAt).localeCompare(a.submittedAt ?? a.updatedAt));
  }

  listActiveApplicationsByCreator(creatorProfileId: string): CreatorVerificationApplication[] {
    return [...this.applications.values()].filter((row) => row.creatorProfileId === creatorProfileId && ["draft", "submitted", "under_review", "needs_more_info"].includes(row.status));
  }

  saveAuditEvent(event: CreatorVerificationAuditEvent): void {
    this.audits.set(event.applicationId, [...(this.audits.get(event.applicationId) ?? []), event]);
  }

  listAuditEvents(applicationId: string): CreatorVerificationAuditEvent[] {
    return this.audits.get(applicationId) ?? [];
  }
}
