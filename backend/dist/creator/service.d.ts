import type { AccountsService } from "../accounts/service.js";
import type { CreatorProfile, CreatorSocialPlatform } from "../accounts/types.js";
import type { ReviewsStore } from "../reviews/store.js";
import { type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import type { NotificationService } from "../notifications/service.js";
import type { CreatorStore } from "./store.js";
import type { CreatorVerificationService } from "../creatorVerification/service.js";
import type { CreatorAnalyticsSummary, CreatorFeedResult, CreatorGuide, CreatorPlaceContentResult, FollowedCreatorSummary, PublicCreatorProfileView } from "./types.js";
interface GuideMonetizationGate {
    evaluateGuideAccess(viewerUserId: string | undefined, creatorProfileId: string, guideId: string): {
        locked: boolean;
        previewSummary?: string;
    };
}
export declare class CreatorService {
    private readonly store;
    private readonly accounts;
    private readonly reviews;
    private readonly subscriptions?;
    private readonly accessEngine?;
    private readonly monetizationGate?;
    private readonly verificationService?;
    private readonly notifications?;
    constructor(store: CreatorStore, accounts: AccountsService, reviews: ReviewsStore, subscriptions?: SubscriptionService | undefined, accessEngine?: FeatureQuotaEngine | undefined, monetizationGate?: GuideMonetizationGate | undefined, verificationService?: CreatorVerificationService | undefined, notifications?: NotificationService | undefined);
    private ensureCreatorFeature;
    private ensureOwner;
    createOrSyncCreatorProfile(userId: string, input: {
        displayName: string;
        handle?: string;
        bio?: string;
        slug?: string;
    }): Promise<CreatorProfile>;
    checkHandleAvailability(handle: string, currentProfileId?: string): {
        handle: string;
        available: boolean;
    };
    updateCreatorProfile(userId: string, profileId: string, input: {
        handle?: string;
        bio?: string;
        avatarUrl?: string;
        coverUrl?: string;
        websiteUrl?: string;
        tags?: string[];
        socialLinks?: Array<{
            platform: CreatorSocialPlatform;
            url: string;
            label?: string;
        }>;
    }): Promise<CreatorProfile>;
    followCreator(userId: string, creatorProfileId: string): Promise<{
        followerCount: number;
        isFollowing: boolean;
    }>;
    unfollowCreator(userId: string, creatorProfileId: string): Promise<{
        followerCount: number;
        isFollowing: boolean;
    }>;
    listFollowedCreators(userId: string, limit?: number): FollowedCreatorSummary[];
    getFollowingFeed(userId: string, input?: {
        limit?: number;
        cursor?: string;
        type?: "all" | "reviews" | "videos" | "guides";
    }): Promise<CreatorFeedResult>;
    getPlaceCreatorContent(placeId: string, viewerUserId?: string, input?: {
        limit?: number;
        cursor?: string;
        type?: "all" | "reviews" | "videos" | "guides";
    }): Promise<CreatorPlaceContentResult>;
    getPublicProfile(slug: string, viewerUserId?: string, opts?: {
        reviewLimit?: number;
        guideLimit?: number;
        reviewSort?: "latest" | "top";
    }): Promise<PublicCreatorProfileView>;
    private listPublicReviewsByCreator;
    createGuide(userId: string, creatorProfileId: string, input: Partial<CreatorGuide> & {
        title: string;
        summary: string;
        body?: string;
    }): Promise<CreatorGuide>;
    updateGuide(userId: string, guideId: string, input: Partial<CreatorGuide>): Promise<CreatorGuide>;
    searchGuides(input?: {
        query?: string;
        city?: string;
        guideType?: CreatorGuide["guideType"];
        limit?: number;
        cursor?: string;
    }): Promise<{
        items: CreatorGuide[];
        nextCursor?: string;
    }>;
    getGuideBySlug(slug: string, guideSlug: string, viewerUserId?: string): CreatorGuide;
    getCreatorAnalytics(userId: string, creatorProfileId: string): CreatorAnalyticsSummary;
    bootstrapFromAccounts(userId: string): void;
}
export {};
