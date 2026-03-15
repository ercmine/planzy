import type { FeedScope } from "../videoPlatform/types.js";

export type DiscoveryMode = "mostly_local" | "balanced" | "global_inspiration";

export interface OnboardingPreferences {
  userId: string;
  onboardingCompleted: boolean;
  preferredLocation: {
    lat?: number;
    lng?: number;
    city?: string;
    region?: string;
    source: "device" | "manual" | "unknown";
  };
  interestCategoryIds: string[];
  discoveryMode: DiscoveryMode;
  creatorContentMode: "balanced" | "creator_first" | "place_facts_first";
  completedAt?: string;
  updatedAt: string;
}

export interface OnboardingStore {
  get(userId: string): Promise<OnboardingPreferences | undefined>;
  save(pref: OnboardingPreferences): Promise<OnboardingPreferences>;
}
