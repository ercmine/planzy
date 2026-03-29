import { type CreatorProfile } from "../accounts/types.js";
import type { CreatorVerificationStore } from "./store.js";
import { type CreatorVerificationApplication, type CreatorVerificationApplicationDraft, type CreatorVerificationConfig, type CreatorVerificationEligibilityResult, type CreatorVerificationPublicBadge, type CreatorVerificationRejectionReasonCode, type CreatorVerificationRevocationReasonCode, type CreatorVerificationStatus } from "./types.js";
interface CreatorVerificationDeps {
    getCreatorProfileByUserId(userId: string): CreatorProfile | undefined;
    getCreatorProfileById(creatorProfileId: string): CreatorProfile | undefined;
    updateCreatorProfile(profile: CreatorProfile): void;
    getUser(userId: string): {
        createdAt: string;
        moderationFlags: string[];
    } | undefined;
}
export declare function getCreatorVerificationBadge(status: CreatorVerificationStatus, approvedAt?: string): CreatorVerificationPublicBadge;
export declare class CreatorVerificationService {
    private readonly store;
    private readonly deps;
    private readonly config;
    constructor(store: CreatorVerificationStore, deps: CreatorVerificationDeps, config?: CreatorVerificationConfig);
    getEligibilityForUser(userId: string): CreatorVerificationEligibilityResult;
    getStatusForUser(userId: string): {
        creatorProfileId?: string;
        status: CreatorVerificationStatus;
        badge: CreatorVerificationPublicBadge;
        application?: CreatorVerificationApplication;
    };
    saveDraft(userId: string, draft: Partial<CreatorVerificationApplicationDraft>): CreatorVerificationApplication;
    submit(userId: string): CreatorVerificationApplication;
    transitionToUnderReview(adminUserId: string, applicationId: string, note?: string): CreatorVerificationApplication;
    requestMoreInfo(adminUserId: string, applicationId: string, publicMessage: string, note?: string): CreatorVerificationApplication;
    approve(adminUserId: string, applicationId: string, note?: string): CreatorVerificationApplication;
    reject(adminUserId: string, applicationId: string, reasonCode: CreatorVerificationRejectionReasonCode, publicMessage: string, note?: string): CreatorVerificationApplication;
    revoke(adminUserId: string, creatorProfileId: string, reasonCode: CreatorVerificationRevocationReasonCode, publicMessage: string, note?: string): CreatorVerificationApplication;
    listAdminApplications(filter?: {
        status?: CreatorVerificationStatus;
        creatorProfileId?: string;
        userId?: string;
    }): CreatorVerificationApplication[];
    getAdminApplicationDetail(applicationId: string): {
        application: CreatorVerificationApplication;
        audit: ReturnType<CreatorVerificationStore["listAuditEvents"]>;
    };
    getPublicBadgeForCreator(creatorProfileId: string): CreatorVerificationPublicBadge;
    private requireApplication;
}
export {};
