import type { BusinessReply, BusinessReviewResponse, BusinessReviewResponseModerationAction, BusinessReviewResponseModerationActionType, BusinessReviewResponseRevision, CreateReviewInput, CreateReviewMediaUploadInput, ListReviewsByAuthorProfileInput, ListReviewsInput, ListReviewsResult, ModerationState, PlaceReview, ReviewMedia, BusinessReviewResponseStatus, ReviewMediaUpload, TrustOverrideInput, UpsertVerificationEvidenceInput, ReviewVerificationOverrideInput, VisitSessionInput, ReviewsStore, UpdateReviewInput } from "./store.js";
import { type ReviewTrustSignals, type ReviewerTrustProfile, type TrustAuditLog, type VerificationEvidence, type ReviewVerificationSummary } from "./trust.js";
export declare class MemoryReviewsStore implements ReviewsStore {
    private readonly byId;
    private readonly helpfulVotes;
    private readonly reports;
    private readonly mediaUploadsById;
    private readonly mediaReports;
    private readonly trustProfiles;
    private readonly reviewTrustSignals;
    private readonly verificationEvidence;
    private readonly verificationSummaries;
    private readonly visitSessions;
    private readonly usedSourceIds;
    private readonly trustAuditLogs;
    private readonly businessResponsesById;
    private readonly businessResponseByReviewId;
    private readonly businessResponseRevisions;
    private readonly businessResponseModerationActions;
    private readonly businessResponseEvents;
    private readonly businessResponseNotifications;
    listByPlace(input: ListReviewsInput): Promise<ListReviewsResult>;
    getById(reviewId: string, viewerUserId?: string, includeHidden?: boolean): Promise<PlaceReview | null>;
    getByPlaceAndAuthor(placeId: string, authorUserId: string): Promise<PlaceReview | null>;
    listByAuthorProfile(input: ListReviewsByAuthorProfileInput): Promise<PlaceReview[]>;
    createOrReplace(input: CreateReviewInput): Promise<PlaceReview>;
    update(input: UpdateReviewInput): Promise<PlaceReview>;
    softDelete(reviewId: string, actorUserId: string, now?: Date): Promise<PlaceReview>;
    setModerationState(reviewId: string, state: ModerationState, reason?: string, now?: Date): Promise<PlaceReview>;
    voteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
    unvoteHelpful(reviewId: string, userId: string): Promise<PlaceReview>;
    reportReview(reviewId: string, userId: string, reason: string): Promise<void>;
    getReviewerTrustProfile(userId: string): Promise<ReviewerTrustProfile>;
    listTrustAuditLogs(userId: string): Promise<TrustAuditLog[]>;
    applyTrustOverride(input: TrustOverrideInput): Promise<ReviewerTrustProfile>;
    getReviewTrustSignals(reviewId: string): Promise<ReviewTrustSignals | null>;
    getReviewVerificationSummary(reviewId: string): Promise<ReviewVerificationSummary | null>;
    listEligibleEvidenceForUser(input: {
        userId: string;
        placeId: string;
        reviewId?: string;
    }): Promise<VerificationEvidence[]>;
    createVisitSession(input: VisitSessionInput): Promise<{
        id: string;
    }>;
    applyReviewVerificationOverride(input: ReviewVerificationOverrideInput): Promise<ReviewVerificationSummary>;
    upsertVerificationEvidence(input: UpsertVerificationEvidenceInput): Promise<VerificationEvidence>;
    createMediaUpload(input: CreateReviewMediaUploadInput): Promise<ReviewMediaUpload>;
    finalizeMediaUpload(input: {
        uploadId: string;
        ownerUserId: string;
        fileSizeBytes?: number;
        durationMs?: number;
        width?: number;
        height?: number;
        checksum?: string;
    }): Promise<ReviewMediaUpload>;
    getMediaUpload(uploadId: string): Promise<ReviewMediaUpload | null>;
    reportReviewMedia(mediaId: string, userId: string, reason: string): Promise<void>;
    setReviewMediaModerationState(reviewId: string, mediaId: string, state: ModerationState, reason?: string, now?: Date): Promise<ReviewMedia>;
    createOrUpdateBusinessReply(input: {
        reviewId: string;
        businessProfileId: string;
        ownerUserId: string;
        body: string;
        now?: Date;
    }): Promise<BusinessReply>;
    deleteBusinessReply(input: {
        reviewId: string;
        replyId: string;
        actorUserId: string;
        businessProfileId: string;
        now?: Date;
    }): Promise<BusinessReply>;
    createOrUpdateBusinessReviewResponse(input: {
        reviewId: string;
        placeId: string;
        businessProfileId: string;
        ownershipLinkId: string;
        authoredByUserId: string;
        content: string;
        moderationRequired: boolean;
        now?: Date;
    }): Promise<BusinessReviewResponse>;
    moderateBusinessReviewResponse(input: {
        responseId: string;
        action: BusinessReviewResponseModerationActionType;
        actedByUserId: string;
        reasonCode?: string;
        notes?: string;
        now?: Date;
    }): Promise<BusinessReviewResponse>;
    removeOwnBusinessReviewResponse(input: {
        responseId: string;
        actorUserId: string;
        businessProfileId: string;
        now?: Date;
    }): Promise<BusinessReviewResponse>;
    getBusinessReviewResponseByReview(reviewId: string, includeHidden?: boolean): Promise<BusinessReviewResponse | null>;
    listBusinessReviewResponseRevisions(responseId: string): Promise<BusinessReviewResponseRevision[]>;
    listBusinessReviewResponseModerationActions(responseId: string): Promise<BusinessReviewResponseModerationAction[]>;
    listReviewsForBusinessResponseDashboard(input: {
        placeIds: string[];
        onlyUnanswered?: boolean;
        limit?: number;
    }): Promise<PlaceReview[]>;
    listBusinessReviewResponsesForModeration(input: {
        statuses?: BusinessReviewResponseStatus[];
        placeId?: string;
        businessProfileId?: string;
        limit?: number;
    }): Promise<BusinessReviewResponse[]>;
    listBusinessResponseEvents(): Promise<Array<{
        eventType: string;
        responseId: string;
        reviewId: string;
        placeId: string;
        actorUserId: string;
        createdAt: string;
    }>>;
    listBusinessResponseNotifications(): Promise<Array<{
        type: string;
        userId: string;
        responseId: string;
        createdAt: string;
    }>>;
    private attachUploadsToReview;
    private pushRevision;
    private pushModerationAction;
    private pushEvent;
    private findMedia;
    private toView;
    private compareRows;
    private recomputeTrustForReview;
    private recomputeTrustForUser;
    private createDefaultTrustProfile;
}
