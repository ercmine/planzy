import type { CreatorVerificationStore } from "./store.js";
import type { CreatorVerificationAdminListFilter, CreatorVerificationApplication, CreatorVerificationAuditEvent } from "./types.js";
export declare class MemoryCreatorVerificationStore implements CreatorVerificationStore {
    private readonly applications;
    private readonly audits;
    saveApplication(application: CreatorVerificationApplication): void;
    getApplicationById(id: string): CreatorVerificationApplication | undefined;
    getLatestForCreator(creatorProfileId: string): CreatorVerificationApplication | undefined;
    listApplications(filter?: CreatorVerificationAdminListFilter): CreatorVerificationApplication[];
    listActiveApplicationsByCreator(creatorProfileId: string): CreatorVerificationApplication[];
    saveAuditEvent(event: CreatorVerificationAuditEvent): void;
    listAuditEvents(applicationId: string): CreatorVerificationAuditEvent[];
}
