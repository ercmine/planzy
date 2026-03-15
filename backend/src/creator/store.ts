import type { CreatorProfile } from "../accounts/types.js";
import type { CreatorAnalyticsPoint, CreatorFollow, CreatorGuide } from "./types.js";

export interface CreatorStore {
  getProfileById(id: string): CreatorProfile | undefined;
  getProfileBySlug(slug: string): CreatorProfile | undefined;
  getProfileByHandle(handle: string): CreatorProfile | undefined;
  saveProfile(profile: CreatorProfile): void;
  listProfiles(): CreatorProfile[];

  createFollow(follow: CreatorFollow): void;
  deleteFollow(creatorProfileId: string, followerUserId: string): void;
  getFollow(creatorProfileId: string, followerUserId: string): CreatorFollow | undefined;
  listFollowedCreatorIds(followerUserId: string): string[];
  listFollowsByCreator(creatorProfileId: string): CreatorFollow[];
  countFollowers(creatorProfileId: string): number;
  countFollowing(userId: string): number;

  createGuide(guide: CreatorGuide): void;
  updateGuide(guide: CreatorGuide): void;
  getGuideById(guideId: string): CreatorGuide | undefined;
  getGuideBySlug(creatorProfileId: string, slug: string): CreatorGuide | undefined;
  listGuidesByCreator(creatorProfileId: string): CreatorGuide[];

  incrementProfileView(creatorProfileId: string, date: string): void;
  incrementGuideView(guideId: string, creatorProfileId: string, date: string): void;
  listAnalytics(creatorProfileId: string): CreatorAnalyticsPoint[];
  getGuideViews(guideId: string): number;
}
