import type { ModerationService } from "../moderation/service.js";
import type { ModerationTargetRef } from "../moderation/types.js";
import type { ContentTrustSummary, CreatorTrustSummary, PlaceTrustSummary } from "./types.js";
export declare class TrustSafetyService {
    private readonly moderation;
    constructor(moderation: ModerationService);
    getContentSummary(target: ModerationTargetRef, baseQuality?: number): ContentTrustSummary;
    summarizeCreator(input: {
        creatorUserId: string;
        contentTargets: ModerationTargetRef[];
        verifiedCreator?: boolean;
    }): CreatorTrustSummary;
    summarizePlace(input: {
        placeId: string;
        contentTargets: ModerationTargetRef[];
    }): PlaceTrustSummary;
}
