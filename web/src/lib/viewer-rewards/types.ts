export type RewardStatus =
  | 'rewardable'
  | 'eligible_soon'
  | 'earned'
  | 'pending'
  | 'denied'
  | 'already_rewarded'
  | 'cap_reached'
  | 'ineligible'
  | 'suspicious';

export type RewardActionType = 'watch' | 'rating' | 'comment';

export interface RewardActionRequirement {
  action: RewardActionType;
  label: string;
  requiredWatchPercent?: number;
  rewardAmountHint?: number;
  unlocked: boolean;
  status: RewardStatus;
  message?: string;
}

export interface RewardCampaign {
  id: string;
  name: string;
  fundingType: 'platform' | 'sponsored';
  sponsorName?: string;
  disclosureLabel?: string;
}

export interface VideoRewardEligibility {
  videoId: string;
  title: string;
  creatorId: string;
  creatorName: string;
  placeId?: string;
  placeName?: string;
  thumbnailUrl?: string;
  rewardStatus: RewardStatus;
  watchPercent: number;
  requiredWatchPercent: number;
  rewardAmountHint?: number;
  campaign?: RewardCampaign;
  actionRequirements: RewardActionRequirement[];
  eligibilityMessage?: string;
  antiAbuseMessage?: string;
}

export interface ViewerRewardSummary {
  lifetimeEarned: number;
  watchEarned: number;
  ratingEarned: number;
  commentEarned: number;
  sponsoredEarned: number;
  pending: number;
  denied: number;
  alreadyRewarded: number;
  dailyCap?: number;
  dailyRemaining?: number;
  weeklyEarned?: number;
  monthlyEarned?: number;
  currentStreakDays?: number;
}

export interface RewardHistoryItem {
  id: string;
  videoId: string;
  videoTitle: string;
  placeName?: string;
  creatorName?: string;
  actionType: RewardActionType;
  rewardAmount: number;
  status: RewardStatus;
  campaign?: RewardCampaign;
  createdAt: string;
  settledAt?: string;
  denialReason?: string;
  statusMessage?: string;
}

export interface ViewerRewardNotification {
  id: string;
  type: 'pending_approved' | 'daily_cap_reached' | 'sponsored_opportunity' | 'comment_approved' | 'generic';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ViewerRewardFeedResponse {
  videos: VideoRewardEligibility[];
}

export interface ViewerRewardHistoryResponse {
  items: RewardHistoryItem[];
}

export interface ViewerRewardNotificationsResponse {
  notifications: ViewerRewardNotification[];
}
