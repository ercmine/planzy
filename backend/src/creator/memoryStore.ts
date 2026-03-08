import type { CreatorProfile } from "../accounts/types.js";
import type { CreatorStore } from "./store.js";
import type { CreatorAnalyticsPoint, CreatorFollow, CreatorGuide } from "./types.js";

export class MemoryCreatorStore implements CreatorStore {
  private readonly profilesById = new Map<string, CreatorProfile>();
  private readonly profileSlugToId = new Map<string, string>();
  private readonly follows = new Map<string, CreatorFollow>();
  private readonly guides = new Map<string, CreatorGuide>();
  private readonly analytics = new Map<string, CreatorAnalyticsPoint>();
  private readonly guideViews = new Map<string, number>();

  getProfileById(id: string): CreatorProfile | undefined {
    return this.profilesById.get(id);
  }

  getProfileBySlug(slug: string): CreatorProfile | undefined {
    const id = this.profileSlugToId.get(slug);
    return id ? this.profilesById.get(id) : undefined;
  }

  saveProfile(profile: CreatorProfile): void {
    const existing = this.profilesById.get(profile.id);
    if (existing && existing.slug !== profile.slug) {
      this.profileSlugToId.delete(existing.slug);
    }
    this.profilesById.set(profile.id, profile);
    this.profileSlugToId.set(profile.slug, profile.id);
  }

  listProfiles(): CreatorProfile[] {
    return [...this.profilesById.values()];
  }

  createFollow(follow: CreatorFollow): void {
    this.follows.set(`${follow.creatorProfileId}:${follow.followerUserId}`, follow);
  }

  deleteFollow(creatorProfileId: string, followerUserId: string): void {
    this.follows.delete(`${creatorProfileId}:${followerUserId}`);
  }

  getFollow(creatorProfileId: string, followerUserId: string): CreatorFollow | undefined {
    return this.follows.get(`${creatorProfileId}:${followerUserId}`);
  }

  countFollowers(creatorProfileId: string): number {
    return [...this.follows.values()].filter((row) => row.creatorProfileId === creatorProfileId).length;
  }

  countFollowing(userId: string): number {
    return [...this.follows.values()].filter((row) => row.followerUserId === userId).length;
  }

  createGuide(guide: CreatorGuide): void {
    this.guides.set(guide.id, guide);
  }

  updateGuide(guide: CreatorGuide): void {
    this.guides.set(guide.id, guide);
  }

  getGuideById(guideId: string): CreatorGuide | undefined {
    return this.guides.get(guideId);
  }

  getGuideBySlug(creatorProfileId: string, slug: string): CreatorGuide | undefined {
    return [...this.guides.values()].find((row) => row.creatorProfileId === creatorProfileId && row.slug === slug);
  }

  listGuidesByCreator(creatorProfileId: string): CreatorGuide[] {
    return [...this.guides.values()].filter((row) => row.creatorProfileId === creatorProfileId);
  }

  incrementProfileView(creatorProfileId: string, date: string): void {
    const key = `${creatorProfileId}:${date}`;
    const current = this.analytics.get(key) ?? { date, profileViews: 0, followerDelta: 0, guideViews: 0 };
    current.profileViews += 1;
    this.analytics.set(key, current);
  }

  incrementGuideView(guideId: string, creatorProfileId: string, date: string): void {
    const key = `${creatorProfileId}:${date}`;
    const current = this.analytics.get(key) ?? { date, profileViews: 0, followerDelta: 0, guideViews: 0 };
    current.guideViews += 1;
    this.analytics.set(key, current);
    this.guideViews.set(guideId, (this.guideViews.get(guideId) ?? 0) + 1);
  }

  listAnalytics(creatorProfileId: string): CreatorAnalyticsPoint[] {
    return [...this.analytics.entries()]
      .filter(([key]) => key.startsWith(`${creatorProfileId}:`))
      .map(([, value]) => value)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getGuideViews(guideId: string): number {
    return this.guideViews.get(guideId) ?? 0;
  }
}
