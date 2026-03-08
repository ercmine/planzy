import type { CreatorProfileStatus, CreatorSocialLink } from "../accounts/types.js";
import type { CreatorVerificationPublicBadge } from "../creatorVerification/types.js";

export type GuideStatus = "draft" | "published" | "hidden" | "archived";
export type GuideFormatType = "guide" | "collection" | "itinerary" | "list";
export type GuideType = "city" | "neighborhood" | "themed" | "best_of" | "itinerary" | "recommendation" | "hidden_gems";
export type GuideModerationStatus = "pending" | "approved" | "flagged" | "removed";
export type GuideVisibility = "public" | "private" | "unlisted";

export interface GuideSection {
  id: string;
  guideId: string;
  title: string;
  description?: string;
  sortOrder: number;
  sectionType?: "intro" | "day" | "morning" | "afternoon" | "evening" | "neighborhood" | "theme" | "custom";
}

export interface GuidePlaceItem {
  id: string;
  guideId: string;
  placeId: string;
  sortOrder: number;
  sectionId?: string;
  dayIndex?: number;
  timeBlock?: "morning" | "afternoon" | "evening" | "night";
  creatorNote?: string;
  tip?: string;
  recommendedDurationMinutes?: number;
  bestTimeLabel?: string;
  budgetLabel?: string;
  isFeatured: boolean;
  attachedReviewId?: string;
  attachedVideoReviewId?: string;
  customTitleOverride?: string;
  mediaOverrideUrl?: string;
  createdAt: string;
  updatedAt: string;
}


export type ContentAccessVisibility = "public" | "followers" | "premium" | "elite" | "membership";

export interface ContentMonetizationMetadata {
  mode: "free" | "premium" | "elite" | "membership";
  access: ContentAccessVisibility;
  previewSummary?: string;
  lockedReasonCode?: string;
  gatingSource?: "creator_plan" | "creator_membership" | "future_bundle";
  minimumPlanRequired?: "free" | "plus" | "elite";
}

export interface CreatorGuide {
  id: string;
  creatorProfileId: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  guideType: GuideType;
  formatType: GuideFormatType;
  coverUrl?: string;
  heroImageMediaId?: string;
  heroVideoMediaId?: string;
  city?: string;
  region?: string;
  estimatedDurationMinutes?: number;
  moderationStatus: GuideModerationStatus;
  status: GuideStatus;
  visibility: GuideVisibility;
  tags: string[];
  placeItems: GuidePlaceItem[];
  sections: GuideSection[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  monetization?: ContentMonetizationMetadata;
}

export interface CreatorFollow {
  id: string;
  creatorProfileId: string;
  followerUserId: string;
  createdAt: string;
}

export interface CreatorAnalyticsPoint {
  date: string;
  profileViews: number;
  followerDelta: number;
  guideViews: number;
}

export interface CreatorAnalyticsSummary {
  totalFollowers: number;
  totalPublicReviews: number;
  totalPublicGuides: number;
  profileViews: number;
  guideViews: number;
  topGuides: Array<{ guideId: string; title: string; views: number }>;
  timeline: CreatorAnalyticsPoint[];
}

export interface PublicCreatorProfileView {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  websiteUrl?: string;
  category?: string;
  tags: string[];
  socialLinks: CreatorSocialLink[];
  followerCount: number;
  followingCount: number;
  publicReviewsCount: number;
  publicGuidesCount: number;
  badges: string[];
  verification: CreatorVerificationPublicBadge;
  status: CreatorProfileStatus;
  isFollowing: boolean;
  reviews: unknown[];
  guides: CreatorGuide[];
}

export interface ListCreatorReviewsInput {
  sort?: "latest" | "top";
  limit?: number;
  cursor?: string;
}


export type CreatorFeedItemType = "review" | "photo_review" | "video_review" | "guide";

export interface CreatorFeedItem {
  feedItemType: CreatorFeedItemType;
  contentId: string;
  creatorProfileId: string;
  creator: {
    id: string;
    slug: string;
    displayName: string;
    avatarUrl?: string;
    isFollowing: boolean;
    verification: CreatorVerificationPublicBadge;
  };
  placeId?: string;
  title?: string;
  summary: string;
  media?: {
    thumbnailUrl?: string;
    url?: string;
    mediaType?: "photo" | "video";
  };
  publishedAt: string;
  surfacedAt: string;
}

export interface CreatorFeedResult {
  items: CreatorFeedItem[];
  nextCursor?: string;
}

export interface CreatorPlaceContentResult {
  items: CreatorFeedItem[];
  nextCursor?: string;
}

export interface FollowedCreatorSummary {
  creatorProfileId: string;
  slug: string;
  displayName: string;
  avatarUrl?: string;
  status: CreatorProfileStatus;
  isPublic: boolean;
  followedAt: string;
}
