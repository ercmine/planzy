export type ContentModerationStatus = "pending" | "published" | "hidden" | "rejected";
export type ContentVisibility = "public" | "private";

export interface ReviewRecord {
  id: string;
  canonicalPlaceId: string;
  authorUserId: string;
  authorProfileId?: string;
  body: string;
  rating?: number;
  status: ContentModerationStatus;
  visibility: ContentVisibility;
  helpfulCount: number;
  reportCount: number;
  trustedReview: boolean;
  qualityScore: number;
  verifiedVisitScore: number;
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
}

export interface CreatorVideoRecord {
  id: string;
  canonicalPlaceId: string;
  authorUserId: string;
  mediaAssetId: string;
  thumbnailAssetId?: string;
  title?: string;
  caption?: string;
  durationSec?: number;
  status: ContentModerationStatus;
  visibility: ContentVisibility;
  qualityScore: number;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface PlaceSaveRecord {
  id: string;
  userId: string;
  canonicalPlaceId: string;
  sourceContext?: "search" | "place_detail" | "guide" | "feed" | "other";
  createdAt: string;
}

export interface GuideRecord {
  id: string;
  ownerUserId: string;
  title: string;
  description?: string;
  visibility: ContentVisibility;
  status: ContentModerationStatus;
  coverAssetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuideItemRecord {
  guideId: string;
  canonicalPlaceId: string;
  position: number;
  note?: string;
  addedAt: string;
}

export interface ContentEngagementRecord {
  id: string;
  canonicalPlaceId: string;
  contentType: "review" | "video" | "guide" | "save";
  contentId?: string;
  eventType: "view" | "click" | "helpful_vote" | "like" | "save" | "guide_add";
  actorUserId?: string;
  createdAt: string;
  value: number;
}

export interface FirstPartyPlaceMetrics {
  canonicalPlaceId: string;
  reviewCount: number;
  creatorVideoCount: number;
  saveCount: number;
  publicGuideCount: number;
  trustedReviewCount: number;
  helpfulVoteCount: number;
  engagementVelocity30d: number;
  contentRichnessScore: number;
  trustScore: number;
  firstPartyQualityBoost: number;
  updatedAt: string;
}

export interface FirstPartyRankingSignals {
  hasReviewsBoost: number;
  reviewCountBoost: number;
  creatorVideoBoost: number;
  saveCountBoost: number;
  guideInclusionBoost: number;
  trustedContentBoost: number;
  engagementBoost: number;
  recencyVelocityBoost: number;
  firstPartyQualityBoost: number;
  cappedTotalBoost: number;
}

export interface PlaceDetailPriorityRules {
  heroMedia: string[];
  creatorVideoOrder: string[];
  reviewOrder: string[];
  relatedPlaces: string[];
}

export interface PlaceDetailTrustSummary {
  trustedReviewCount: number;
  trustedCreatorVideoCount: number;
  moderationCoverage: number;
  verificationNotes: string[];
}

export interface PlaceDetailSourceSummary {
  descriptionSourceLabel: string;
  mediaSourceLabel: string;
  attributionAvailable: boolean;
}

export interface PremiumPlaceDetailContent {
  canonicalPlaceId: string;
  heroMedia: CreatorVideoRecord[];
  creatorVideos: CreatorVideoRecord[];
  bestReviews: ReviewRecord[];
  galleryMedia: CreatorVideoRecord[];
  quickFacts: {
    reviewCount: number;
    creatorVideoCount: number;
    saveCount: number;
    trustedReviewCount: number;
  };
  sourceSummary: PlaceDetailSourceSummary;
  trustSummary: PlaceDetailTrustSummary;
  priorityRules: PlaceDetailPriorityRules;
  metrics?: FirstPartyPlaceMetrics;
  rankingBoost?: FirstPartyRankingSignals;
}
