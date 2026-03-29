import type { BusinessContactMethodRecord, BusinessContactMethodType, BusinessTrustProfile, BusinessTrustPublicView, ClaimActor, ContactVerificationMethod, ContactVerificationStatus } from "./types.js";
import type { VenueClaimStore } from "./store.js";
export declare class BusinessTrustService {
    private readonly store;
    private readonly now;
    constructor(store: VenueClaimStore, now?: () => Date);
    recompute(placeId: string): Promise<BusinessTrustProfile>;
    upsertContactMethod(placeId: string, input: {
        type: BusinessContactMethodType;
        value: string;
        isPrimary?: boolean;
    }, actor?: ClaimActor): Promise<BusinessContactMethodRecord>;
    setContactVerificationStatus(input: {
        placeId: string;
        contactMethodId: string;
        status: ContactVerificationStatus;
        method?: ContactVerificationMethod;
        reasonCode?: string;
        actor?: ClaimActor;
    }): Promise<BusinessContactMethodRecord>;
    buildPublicTrustView(placeId: string): Promise<BusinessTrustPublicView>;
    private buildBadges;
    private resolveClaimedStatus;
    private resolveCompletenessTier;
    private normalizeContactValue;
    private appendAuditEvent;
}
