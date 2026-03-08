import type { CreatorProfileStatus, CreatorSocialLink } from "../accounts/types.js";

export type GuideStatus = "draft" | "published" | "hidden" | "archived";

export interface CreatorGuide {
  id: string;
  creatorProfileId: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  coverUrl?: string;
  status: GuideStatus;
  visibility: "public" | "private";
  tags: string[];
  placeIds: string[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
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
