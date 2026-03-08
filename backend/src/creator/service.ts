import { randomUUID } from "node:crypto";

import type { AccountsService } from "../accounts/service.js";
import { CreatorProfileStatus } from "../accounts/types.js";
import type { CreatorProfile, CreatorSocialLink, CreatorSocialPlatform } from "../accounts/types.js";
import { ValidationError } from "../plans/errors.js";
import type { PlaceReview, ReviewsStore } from "../reviews/store.js";
import { FEATURE_KEYS, type FeatureQuotaEngine } from "../subscriptions/accessEngine.js";
import type { SubscriptionService } from "../subscriptions/service.js";
import { SubscriptionTargetType } from "../subscriptions/types.js";
import type { CreatorStore } from "./store.js";
import type { CreatorAnalyticsSummary, CreatorFeedItem, CreatorFeedItemType, CreatorFeedResult, CreatorGuide, CreatorPlaceContentResult, FollowedCreatorSummary, PublicCreatorProfileView } from "./types.js";

const RESERVED_SLUGS = new Set(["admin", "api", "creator", "creators", "settings", "support"]);
const SOCIAL_HOSTS: Record<CreatorSocialPlatform, string[]> = {
  website: [],
  instagram: ["instagram.com", "www.instagram.com"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  x: ["x.com", "twitter.com", "www.x.com", "www.twitter.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
  linkedin: ["linkedin.com", "www.linkedin.com"]
};

function slugify(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
}

function parseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ValidationError(["invalid url"]);
  }
  if (!url.protocol.startsWith("http")) throw new ValidationError(["url must use http or https"]);
  return url;
}



function encodeFeedCursor(item: { surfacedAt: string; key: string }): string {
  return Buffer.from(JSON.stringify(item), "utf8").toString("base64url");
}

function decodeFeedCursor(cursor?: string): { surfacedAt: string; key: string } | null {
  if (!cursor) return null;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    const surfacedAt = typeof parsed.surfacedAt === "string" ? parsed.surfacedAt : "";
    const key = typeof parsed.key === "string" ? parsed.key : "";
    if (!surfacedAt || !key) return null;
    return { surfacedAt, key };
  } catch {
    return null;
  }
}

function normalizeSocialLinks(links: Array<{ platform: CreatorSocialPlatform; url: string; label?: string }>, now: string): CreatorSocialLink[] {
  if (links.length > 8) throw new ValidationError(["too many social links"]);
  return links.map((item, index) => {
    const url = parseUrl(item.url);
    const hosts = SOCIAL_HOSTS[item.platform];
    if (hosts.length > 0 && !hosts.includes(url.hostname.toLowerCase())) {
      throw new ValidationError([`invalid host for ${item.platform}`]);
    }
    return {
      id: `csl_${randomUUID()}`,
      platform: item.platform,
      url: url.toString(),
      label: item.label?.slice(0, 60),
      displayOrder: index,
      createdAt: now,
      updatedAt: now
    };
  });
}

export class CreatorService {
  constructor(
    private readonly store: CreatorStore,
    private readonly accounts: AccountsService,
    private readonly reviews: ReviewsStore,
    private readonly subscriptions?: SubscriptionService,
    private readonly accessEngine?: FeatureQuotaEngine
  ) {}

  private async ensureCreatorFeature(userId: string, profileId: string, feature: keyof typeof FEATURE_KEYS): Promise<void> {
    if (!this.subscriptions || !this.accessEngine) return;
    this.subscriptions.ensureAccount(profileId, SubscriptionTargetType.CREATOR);
    const decision = await this.accessEngine.checkFeatureAccess({ targetType: SubscriptionTargetType.CREATOR, targetId: profileId }, FEATURE_KEYS[feature]);
    if (!decision.allowed) throw new Error("CREATOR_PLAN_REQUIRED");
    if (!userId) throw new Error("AUTH_REQUIRED");
  }

  private ensureOwner(userId: string, profileId: string): CreatorProfile {
    const profile = this.store.getProfileById(profileId) ?? this.accounts.getIdentitySummary(userId).creatorProfile;
    if (!profile || profile.userId !== userId) throw new Error("CREATOR_CONTEXT_NOT_ALLOWED");
    return profile;
  }

  async createOrSyncCreatorProfile(userId: string, input: { displayName: string; handle?: string; bio?: string; slug?: string }): Promise<CreatorProfile> {
    const identity = this.accounts.getIdentitySummary(userId);
    const source = identity.creatorProfile;
    if (!source) throw new Error("CREATOR_ROLE_REQUIRED");
    await this.ensureCreatorFeature(userId, source.id, "CREATOR_PROFILE_ENABLED");

    const desiredSlug = slugify(input.slug ?? input.handle ?? input.displayName);
    if (!desiredSlug || RESERVED_SLUGS.has(desiredSlug)) throw new ValidationError(["slug is reserved or invalid"]);
    const existingSlug = this.store.getProfileBySlug(desiredSlug);
    if (existingSlug && existingSlug.id !== source.id) throw new Error("SLUG_TAKEN");

    const now = new Date().toISOString();
    const profile: CreatorProfile = {
      ...source,
      displayName: input.displayName,
      creatorName: input.displayName,
      slug: desiredSlug,
      handle: input.handle,
      bio: input.bio,
      tags: source.tags ?? [],
      socialLinks: source.socialLinks ?? [],
      followerCount: this.store.countFollowers(source.id),
      followingCount: this.store.countFollowing(userId),
      publicReviewsCount: source.publicReviewsCount ?? 0,
      publicGuidesCount: this.store.listGuidesByCreator(source.id).filter((g) => g.status === "published" && g.visibility === "public").length,
      badges: source.badges ?? [],
      status: source.status ?? CreatorProfileStatus.ACTIVE,
      isPublic: source.isPublic ?? true,
      updatedAt: now
    };
    this.store.saveProfile(profile);
    return profile;
  }

  async updateCreatorProfile(userId: string, profileId: string, input: { bio?: string; avatarUrl?: string; coverUrl?: string; websiteUrl?: string; tags?: string[]; socialLinks?: Array<{ platform: CreatorSocialPlatform; url: string; label?: string }> }): Promise<CreatorProfile> {
    const existing = this.ensureOwner(userId, profileId);
    const now = new Date().toISOString();
    const socialLinks = input.socialLinks ? normalizeSocialLinks(input.socialLinks, now) : existing.socialLinks;
    const websiteUrl = input.websiteUrl ? parseUrl(input.websiteUrl).toString() : existing.websiteUrl;
    const profile: CreatorProfile = {
      ...existing,
      bio: input.bio ?? existing.bio,
      avatarUrl: input.avatarUrl ?? existing.avatarUrl,
      coverUrl: input.coverUrl ?? existing.coverUrl,
      websiteUrl,
      tags: (input.tags ?? existing.tags ?? []).slice(0, 8),
      socialLinks,
      followerCount: this.store.countFollowers(existing.id),
      followingCount: this.store.countFollowing(userId),
      updatedAt: now
    };
    this.store.saveProfile(profile);
    return profile;
  }

  async followCreator(userId: string, creatorProfileId: string): Promise<{ followerCount: number; isFollowing: boolean }> {
    const profile = this.store.getProfileById(creatorProfileId);
    if (!profile || !profile.isPublic || profile.status !== CreatorProfileStatus.ACTIVE) throw new Error("CREATOR_NOT_FOLLOWABLE");
    if (profile.userId === userId) throw new ValidationError(["cannot follow yourself"]);
    if (this.store.getFollow(creatorProfileId, userId)) return { followerCount: this.store.countFollowers(creatorProfileId), isFollowing: true };
    this.store.createFollow({ id: `cf_${randomUUID()}`, creatorProfileId, followerUserId: userId, createdAt: new Date().toISOString() });
    return { followerCount: this.store.countFollowers(creatorProfileId), isFollowing: true };
  }

  async unfollowCreator(userId: string, creatorProfileId: string): Promise<{ followerCount: number; isFollowing: boolean }> {
    this.store.deleteFollow(creatorProfileId, userId);
    return { followerCount: this.store.countFollowers(creatorProfileId), isFollowing: false };
  }

  listFollowedCreators(userId: string, limit = 200): FollowedCreatorSummary[] {
    const follows = this.store
      .listFollowedCreatorIds(userId)
      .map((creatorProfileId) => ({ follow: this.store.getFollow(creatorProfileId, userId), profile: this.store.getProfileById(creatorProfileId) }))
      .filter((row): row is { follow: NonNullable<typeof row.follow>; profile: NonNullable<typeof row.profile> } => Boolean(row.follow && row.profile))
      .sort((a, b) => b.follow.createdAt.localeCompare(a.follow.createdAt))
      .slice(0, Math.max(1, Math.min(limit, 500)));

    return follows.map((row) => ({
      creatorProfileId: row.profile.id,
      slug: row.profile.slug,
      displayName: row.profile.displayName,
      avatarUrl: row.profile.avatarUrl,
      status: row.profile.status,
      isPublic: row.profile.isPublic,
      followedAt: row.follow.createdAt
    }));
  }

  async getFollowingFeed(userId: string, input?: {
    limit?: number;
    cursor?: string;
    type?: "all" | "reviews" | "videos" | "guides";
  }): Promise<CreatorFeedResult> {
    const limit = Math.max(1, Math.min(input?.limit ?? 20, 50));
    const followedIds = this.store.listFollowedCreatorIds(userId);
    if (!followedIds.length) return { items: [] };

    const activeCreatorIds = followedIds.filter((id) => {
      const profile = this.store.getProfileById(id);
      return Boolean(profile && profile.isPublic && profile.status === CreatorProfileStatus.ACTIVE);
    });
    if (!activeCreatorIds.length) return { items: [] };

    const profileMap = new Map(activeCreatorIds.map((id) => [id, this.store.getProfileById(id)!]));
    const reviewItems = input?.type === "guides"
      ? []
      : (await Promise.all(activeCreatorIds.map((creatorProfileId) => this.listPublicReviewsByCreator(creatorProfileId, "latest", 40, userId)))).flat()
          .filter((review) => review.moderationState === "published" && !review.deletedAt)
          .map((review): CreatorFeedItem => {
            const media = review.media.find((item) => item.mediaType === "video") ?? review.media.find((item) => item.mediaType === "photo");
            const itemType: CreatorFeedItemType = media?.mediaType === "video" ? "video_review" : media?.mediaType === "photo" ? "photo_review" : "review";
            return {
              feedItemType: itemType,
              contentId: review.id,
              creatorProfileId: review.authorProfileId,
              creator: {
                id: review.authorProfileId,
                slug: profileMap.get(review.authorProfileId)?.slug ?? "",
                displayName: review.author.displayName,
                avatarUrl: review.author.avatarUrl,
                isFollowing: true
              },
              placeId: review.placeId,
              summary: review.text.slice(0, 280),
              media: media ? {
                thumbnailUrl: media.variants.thumbnailUrl ?? media.posterUrl,
                url: media.playbackUrl ?? media.variants.mediumUrl ?? media.variants.fullUrl,
                mediaType: media.mediaType
              } : undefined,
              publishedAt: review.createdAt,
              surfacedAt: review.createdAt
            };
          });

    const guideItems = input?.type === "reviews" || input?.type === "videos"
      ? []
      : activeCreatorIds
          .flatMap((creatorProfileId) => this.store.listGuidesByCreator(creatorProfileId))
          .filter((guide) => guide.status === "published" && guide.visibility === "public")
          .map((guide): CreatorFeedItem => ({
            feedItemType: "guide",
            contentId: guide.id,
            creatorProfileId: guide.creatorProfileId,
            creator: {
              id: guide.creatorProfileId,
              slug: profileMap.get(guide.creatorProfileId)?.slug ?? "",
              displayName: profileMap.get(guide.creatorProfileId)?.displayName ?? "Creator",
              avatarUrl: profileMap.get(guide.creatorProfileId)?.avatarUrl,
              isFollowing: true
            },
            placeId: guide.placeIds[0],
            title: guide.title,
            summary: guide.summary,
            media: guide.coverUrl ? { thumbnailUrl: guide.coverUrl, url: guide.coverUrl, mediaType: "photo" } : undefined,
            publishedAt: guide.publishedAt ?? guide.createdAt,
            surfacedAt: guide.publishedAt ?? guide.createdAt
          }));

    const all = [...reviewItems, ...guideItems]
      .filter((item) => {
        if (input?.type === "videos") return item.feedItemType === "video_review";
        if (input?.type === "reviews") return ["review", "photo_review", "video_review"].includes(item.feedItemType);
        if (input?.type === "guides") return item.feedItemType === "guide";
        return true;
      })
      .sort((a, b) => {
        if (b.surfacedAt !== a.surfacedAt) return b.surfacedAt.localeCompare(a.surfacedAt);
        const ak = `${a.feedItemType}:${a.contentId}`;
        const bk = `${b.feedItemType}:${b.contentId}`;
        return bk.localeCompare(ak);
      });

    const deduped: CreatorFeedItem[] = [];
    const seen = new Set<string>();
    for (const item of all) {
      const k = `${item.feedItemType}:${item.contentId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(item);
    }

    const cursor = decodeFeedCursor(input?.cursor);
    const startIndex = cursor
      ? deduped.findIndex((row) => row.surfacedAt === cursor.surfacedAt && `${row.feedItemType}:${row.contentId}` === cursor.key) + 1
      : 0;
    const page = deduped.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);
    const tail = page.at(-1);

    return {
      items: page,
      nextCursor: tail ? encodeFeedCursor({ surfacedAt: tail.surfacedAt, key: `${tail.feedItemType}:${tail.contentId}` }) : undefined
    };
  }

  async getPlaceCreatorContent(placeId: string, viewerUserId?: string, input?: {
    limit?: number;
    cursor?: string;
    type?: "all" | "reviews" | "videos" | "guides";
  }): Promise<CreatorPlaceContentResult> {
    const limit = Math.max(1, Math.min(input?.limit ?? 20, 50));
    const reviewsResult = await this.reviews.listByPlace({
      placeId,
      viewerUserId,
      sort: "most_helpful",
      limit: 50
    });

    const reviewItems = reviewsResult.reviews
      .filter((review) => review.authorProfileType === "CREATOR" && review.moderationState === "published" && !review.deletedAt)
      .filter((review) => {
        const profile = this.store.getProfileById(review.authorProfileId);
        return Boolean(profile && profile.isPublic && profile.status === CreatorProfileStatus.ACTIVE);
      })
      .map((review): CreatorFeedItem => {
        const profile = this.store.getProfileById(review.authorProfileId);
        const media = review.media.find((item) => item.mediaType === "video") ?? review.media.find((item) => item.mediaType === "photo");
        const itemType: CreatorFeedItemType = media?.mediaType === "video" ? "video_review" : media?.mediaType === "photo" ? "photo_review" : "review";
        return {
          feedItemType: itemType,
          contentId: review.id,
          creatorProfileId: review.authorProfileId,
          creator: {
            id: review.authorProfileId,
            slug: profile?.slug ?? "",
            displayName: review.author.displayName,
            avatarUrl: review.author.avatarUrl,
            isFollowing: viewerUserId ? Boolean(this.store.getFollow(review.authorProfileId, viewerUserId)) : false
          },
          placeId: review.placeId,
          summary: review.text.slice(0, 280),
          media: media ? {
            thumbnailUrl: media.variants.thumbnailUrl ?? media.posterUrl,
            url: media.playbackUrl ?? media.variants.mediumUrl ?? media.variants.fullUrl,
            mediaType: media.mediaType
          } : undefined,
          publishedAt: review.createdAt,
          surfacedAt: review.createdAt
        };
      });

    const guides = this.store
      .listProfiles()
      .filter((profile) => profile.isPublic && profile.status === CreatorProfileStatus.ACTIVE)
      .flatMap((profile) => this.store.listGuidesByCreator(profile.id).map((guide) => ({ profile, guide })))
      .filter((row) => row.guide.status === "published" && row.guide.visibility === "public" && row.guide.placeIds.includes(placeId))
      .map(({ profile, guide }): CreatorFeedItem => ({
        feedItemType: "guide",
        contentId: guide.id,
        creatorProfileId: profile.id,
        creator: {
          id: profile.id,
          slug: profile.slug,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
          isFollowing: viewerUserId ? Boolean(this.store.getFollow(profile.id, viewerUserId)) : false
        },
        placeId,
        title: guide.title,
        summary: guide.summary,
        media: guide.coverUrl ? { thumbnailUrl: guide.coverUrl, url: guide.coverUrl, mediaType: "photo" } : undefined,
        publishedAt: guide.publishedAt ?? guide.createdAt,
        surfacedAt: guide.publishedAt ?? guide.createdAt
      }));

    const filtered = [...reviewItems, ...guides]
      .filter((item) => {
        if (input?.type === "videos") return item.feedItemType === "video_review";
        if (input?.type === "reviews") return ["review", "photo_review", "video_review"].includes(item.feedItemType);
        if (input?.type === "guides") return item.feedItemType === "guide";
        return true;
      })
      .sort((a, b) => {
        if (b.surfacedAt !== a.surfacedAt) return b.surfacedAt.localeCompare(a.surfacedAt);
        const ak = `${a.feedItemType}:${a.contentId}`;
        const bk = `${b.feedItemType}:${b.contentId}`;
        return bk.localeCompare(ak);
      });

    const cursor = decodeFeedCursor(input?.cursor);
    const startIndex = cursor
      ? filtered.findIndex((row) => row.surfacedAt === cursor.surfacedAt && `${row.feedItemType}:${row.contentId}` === cursor.key) + 1
      : 0;
    const page = filtered.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);
    const tail = page.at(-1);

    return {
      items: page,
      nextCursor: tail ? encodeFeedCursor({ surfacedAt: tail.surfacedAt, key: `${tail.feedItemType}:${tail.contentId}` }) : undefined
    };
  }

  async getPublicProfile(slug: string, viewerUserId?: string, opts?: { reviewLimit?: number; guideLimit?: number; reviewSort?: "latest" | "top" }): Promise<PublicCreatorProfileView> {
    const profile = this.store.getProfileBySlug(slug);
    if (!profile || !profile.isPublic || profile.status !== CreatorProfileStatus.ACTIVE) throw new Error("CREATOR_NOT_FOUND");
    const reviews = await this.listPublicReviewsByCreator(profile.id, opts?.reviewSort, opts?.reviewLimit, viewerUserId);
    const guides = this.store
      .listGuidesByCreator(profile.id)
      .filter((g) => g.status === "published" && g.visibility === "public")
      .sort((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt))
      .slice(0, Math.min(50, opts?.guideLimit ?? 20));
    this.store.incrementProfileView(profile.id, new Date().toISOString().slice(0, 10));
    return {
      id: profile.id,
      userId: profile.userId,
      slug: profile.slug,
      displayName: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      coverUrl: profile.coverUrl,
      websiteUrl: profile.websiteUrl,
      category: profile.category,
      tags: profile.tags,
      socialLinks: profile.socialLinks,
      followerCount: this.store.countFollowers(profile.id),
      followingCount: this.store.countFollowing(profile.userId),
      publicReviewsCount: reviews.length,
      publicGuidesCount: guides.length,
      badges: profile.badges,
      status: profile.status,
      isFollowing: viewerUserId ? Boolean(this.store.getFollow(profile.id, viewerUserId)) : false,
      reviews,
      guides
    };
  }

  private async listPublicReviewsByCreator(creatorProfileId: string, sort: "latest" | "top" = "latest", limit = 20, viewerUserId?: string): Promise<PlaceReview[]> {
    if (!("listByAuthorProfile" in this.reviews)) return [];
    const rows = await (this.reviews as ReviewsStore & { listByAuthorProfile(input: { authorProfileType: "CREATOR"; authorProfileId: string; viewerUserId?: string; limit?: number; sort?: "latest" | "top" }): Promise<PlaceReview[]> }).listByAuthorProfile({
      authorProfileType: "CREATOR",
      authorProfileId: creatorProfileId,
      viewerUserId,
      limit,
      sort
    });
    return rows;
  }

  createGuide(userId: string, creatorProfileId: string, input: { title: string; summary: string; body: string; coverUrl?: string; tags?: string[]; placeIds?: string[]; status?: "draft" | "published" | "hidden" | "archived" }): CreatorGuide {
    const profile = this.ensureOwner(userId, creatorProfileId);
    const now = new Date().toISOString();
    const status = input.status ?? "draft";
    if (status === "published" && profile.status !== CreatorProfileStatus.ACTIVE) throw new Error("CREATOR_NOT_ACTIVE");
    const guide: CreatorGuide = {
      id: `cg_${randomUUID()}`,
      creatorProfileId,
      title: input.title.trim().slice(0, 140),
      slug: `${slugify(input.title)}-${randomUUID().slice(0, 6)}`,
      summary: input.summary.trim().slice(0, 500),
      body: input.body.trim(),
      coverUrl: input.coverUrl,
      status,
      visibility: status === "published" ? "public" : "private",
      tags: (input.tags ?? []).slice(0, 8),
      placeIds: (input.placeIds ?? []).slice(0, 20),
      publishedAt: status === "published" ? now : undefined,
      createdAt: now,
      updatedAt: now
    };
    this.store.createGuide(guide);
    return guide;
  }

  updateGuide(userId: string, guideId: string, input: Partial<Pick<CreatorGuide, "title" | "summary" | "body" | "coverUrl" | "tags" | "placeIds" | "status">>): CreatorGuide {
    const existing = this.store.getGuideById(guideId);
    if (!existing) throw new Error("GUIDE_NOT_FOUND");
    this.ensureOwner(userId, existing.creatorProfileId);
    const now = new Date().toISOString();
    const nextStatus = input.status ?? existing.status;
    const guide: CreatorGuide = {
      ...existing,
      title: input.title?.trim().slice(0, 140) ?? existing.title,
      summary: input.summary?.trim().slice(0, 500) ?? existing.summary,
      body: input.body?.trim() ?? existing.body,
      coverUrl: input.coverUrl ?? existing.coverUrl,
      tags: (input.tags ?? existing.tags).slice(0, 8),
      placeIds: (input.placeIds ?? existing.placeIds).slice(0, 20),
      status: nextStatus,
      visibility: nextStatus === "published" ? "public" : "private",
      publishedAt: nextStatus === "published" ? existing.publishedAt ?? now : undefined,
      updatedAt: now
    };
    this.store.updateGuide(guide);
    return guide;
  }

  getGuideBySlug(slug: string, guideSlug: string, viewerUserId?: string): CreatorGuide {
    const profile = this.store.getProfileBySlug(slug);
    if (!profile) throw new Error("CREATOR_NOT_FOUND");
    const guide = this.store.getGuideBySlug(profile.id, guideSlug);
    if (!guide) throw new Error("GUIDE_NOT_FOUND");
    if (!(guide.status === "published" && guide.visibility === "public") && viewerUserId !== profile.userId) {
      throw new Error("GUIDE_NOT_FOUND");
    }
    this.store.incrementGuideView(guide.id, profile.id, new Date().toISOString().slice(0, 10));
    return guide;
  }

  getCreatorAnalytics(userId: string, creatorProfileId: string): CreatorAnalyticsSummary {
    const profile = this.ensureOwner(userId, creatorProfileId);
    const guides = this.store.listGuidesByCreator(profile.id);
    const timeline = this.store.listAnalytics(profile.id);
    const topGuides = guides
      .map((guide) => ({ guideId: guide.id, title: guide.title, views: this.store.getGuideViews(guide.id) }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    const profileViews = timeline.reduce((sum, item) => sum + item.profileViews, 0);
    const guideViews = timeline.reduce((sum, item) => sum + item.guideViews, 0);
    return {
      totalFollowers: this.store.countFollowers(profile.id),
      totalPublicReviews: profile.publicReviewsCount,
      totalPublicGuides: guides.filter((g) => g.status === "published" && g.visibility === "public").length,
      profileViews,
      guideViews,
      topGuides,
      timeline
    };
  }

  bootstrapFromAccounts(userId: string): void {
    const creator = this.accounts.getIdentitySummary(userId).creatorProfile;
    if (creator) {
      this.store.saveProfile(creator);
    }
  }
}
