import type { ModerationState, ModerationTargetRef } from "../moderation/types.js";
export type TrustTier = "low" | "developing" | "trusted" | "high";
export interface ContentTrustSummary {
    target: ModerationTargetRef;
    moderationState: ModerationState;
    trustScore: number;
    trustTier: TrustTier;
    badges: string[];
    rankingAdjustment: number;
    reasons: string[];
}
export interface CreatorTrustSummary {
    creatorUserId: string;
    trustScore: number;
    trustTier: TrustTier;
    moderationPenalty: number;
    verifiedCreator: boolean;
    publishedCount: number;
    hiddenOrRejectedCount: number;
}
export interface PlaceTrustSummary {
    placeId: string;
    trustedContentCount: number;
    totalContentCount: number;
    moderationIssueCount: number;
    trustedContentRatio: number;
    trustScore: number;
    trustTier: TrustTier;
}
