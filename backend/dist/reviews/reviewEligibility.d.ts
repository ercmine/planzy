import type { CanonicalPlace } from "../places/types.js";
import type { PlaceReview } from "./store.js";
export type ReviewEligibilityReasonCode = "allowed" | "location_permission_missing" | "location_unavailable" | "location_too_old" | "accuracy_too_low" | "too_far_from_place" | "place_location_unknown" | "suspicious_location" | "already_reviewed_recently" | "review_locked_by_policy";
export interface DeviceLocationProof {
    lat?: number;
    lng?: number;
    accuracyMeters?: number;
    capturedAt?: string;
    isMocked?: boolean;
    speedMps?: number;
}
export interface ReviewEligibilityDecision {
    allowed: boolean;
    reasonCode: ReviewEligibilityReasonCode;
    distanceMeters?: number;
    thresholdMeters?: number;
    requiresFreshLocation: boolean;
    requiresPermission: boolean;
    requiresCheckIn: boolean;
    message: string;
    riskFlags: string[];
}
export interface ReviewEligibilityPolicy {
    version: string;
    defaultRadiusMeters: number;
    placeTypeRadiusMeters: Record<string, number>;
    largeVenueRadiusMeters: number;
    staleLocationMs: number;
    maxAccuracyMeters: number;
    graceMeters: number;
    suspiciousSpeedMps: number;
    recentReviewCooldownMs: number;
}
export interface ReviewEligibilityAuditRecord {
    userId: string;
    placeId: string;
    checkedAt: string;
    decision: ReviewEligibilityDecision;
    location: DeviceLocationProof;
}
export declare class ReviewEligibilityService {
    private readonly policy;
    private readonly audit;
    constructor(policy?: Partial<ReviewEligibilityPolicy>);
    getPolicy(): ReviewEligibilityPolicy;
    listAudit(userId?: string): ReviewEligibilityAuditRecord[];
    evaluate(input: {
        userId: string;
        place: CanonicalPlace | null;
        location: DeviceLocationProof;
        now?: Date;
        recentReviews?: PlaceReview[];
    }): ReviewEligibilityDecision;
    private record;
}
