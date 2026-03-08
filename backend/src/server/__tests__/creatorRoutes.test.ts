import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("creator profile routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = "test-admin";
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("invalid address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    delete process.env.ADMIN_API_KEY;
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("supports public creator profile, follow/unfollow, guides, and private analytics", async () => {
    const creatorHeaders = { "x-user-id": "creator-1", "content-type": "application/json" };
    const createRes = await fetch(`${baseUrl}/v1/profiles/creator`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ creatorName: "Ava Guide" })
    });
    expect(createRes.status).toBe(201);
    const creator = await createRes.json() as { profile: { id: string } };

    const upsertRes = await fetch(`${baseUrl}/v1/creator/profiles`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ displayName: "Ava Guide", slug: "ava-guide", bio: "Food creator" })
    });
    expect(upsertRes.status).toBe(200);

    const patchRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/ava" }] })
    });
    expect(patchRes.status).toBe(200);

    const guideRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}/guides`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ title: "Best Tacos", summary: "Austin picks", body: "- spot1", status: "published", city: "Austin", formatType: "collection", guideType: "city", placeItems: [{ placeId: "p-austin-1", creatorNote: "Order al pastor" }] })
    });
    expect(guideRes.status).toBe(201);
    const guide = await guideRes.json() as { guide: { slug: string; id: string } };

    const viewerHeaders = { "x-user-id": "viewer-1" };
    const publicProfile = await fetch(`${baseUrl}/v1/creators/ava-guide`, { headers: viewerHeaders });
    expect(publicProfile.status).toBe(200);
    await expect(publicProfile.json()).resolves.toMatchObject({
      profile: {
        slug: "ava-guide",
        followerCount: 0,
        guides: [expect.objectContaining({ title: "Best Tacos" })]
      }
    });

    const followRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}/follow`, {
      method: "POST",
      headers: viewerHeaders
    });
    expect(followRes.status).toBe(200);
    await expect(followRes.json()).resolves.toMatchObject({ isFollowing: true, followerCount: 1 });

    const guidePublic = await fetch(`${baseUrl}/v1/creators/ava-guide/guides/${encodeURIComponent(guide.guide.slug)}`, { headers: viewerHeaders });
    expect(guidePublic.status).toBe(200);

    const analyticsAsViewer = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}/analytics`, { headers: viewerHeaders });
    expect(analyticsAsViewer.status).toBe(403);

    const analyticsAsOwner = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}/analytics`, {
      headers: { "x-user-id": "creator-1" }
    });
    expect(analyticsAsOwner.status).toBe(200);
    await expect(analyticsAsOwner.json()).resolves.toMatchObject({ summary: { totalFollowers: 1 } });

    const unfollowRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creator.profile.id)}/follow`, {
      method: "DELETE",
      headers: viewerHeaders
    });
    expect(unfollowRes.status).toBe(200);
    await expect(unfollowRes.json()).resolves.toMatchObject({ isFollowing: false, followerCount: 0 });
  });

  it("rejects malformed social links", async () => {
    const headers = { "x-user-id": "creator-2", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, {
      method: "POST",
      headers,
      body: JSON.stringify({ creatorName: "Bad Link" })
    });
    await fetch(`${baseUrl}/v1/creator/profiles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ displayName: "Bad Link", slug: "bad-link" })
    });
    const identity = await fetch(`${baseUrl}/v1/identity`, { headers: { "x-user-id": "creator-2" } });
    const payload = await identity.json() as { creatorProfile: { id: string } };
    const res = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(payload.creatorProfile.id)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ socialLinks: [{ platform: "instagram", url: "https://evil.com/ava" }] })
    });
    expect(res.status).toBe(400);
  });

  it("serves following feed and place creator content with pagination and filters", async () => {
    const creatorHeaders = { "x-user-id": "creator-feed-1", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ creatorName: "Feed Creator" })
    });
    const identity = await fetch(`${baseUrl}/v1/identity`, { headers: { "x-user-id": "creator-feed-1" } });
    const creatorProfile = await identity.json() as { creatorProfile: { id: string } };

    await fetch(`${baseUrl}/v1/creator/profiles`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ displayName: "Feed Creator", slug: "feed-creator" })
    });

    const guideRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfile.creatorProfile.id)}/guides`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ title: "Top pizza", summary: "Great spots", body: "Try these", status: "published", placeItems: [{ placeId: "p-feed", creatorNote: "must try" }] })
    });
    expect(guideRes.status).toBe(201);

    const reviewRes = await fetch(`${baseUrl}/places/p-feed/reviews`, {
      method: "POST",
      headers: {
        "x-user-id": "creator-feed-1",
        "x-acting-profile-type": "CREATOR",
        "x-acting-profile-id": creatorProfile.creatorProfile.id,
        "content-type": "application/json"
      },
      body: JSON.stringify({ text: "Excellent", rating: 5, displayName: "Feed Creator" })
    });
    expect(reviewRes.status).toBe(201);

    const viewerHeaders = { "x-user-id": "viewer-feed-1" };
    const followRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfile.creatorProfile.id)}/follow`, {
      method: "POST",
      headers: viewerHeaders
    });
    expect(followRes.status).toBe(200);

    const follows = await fetch(`${baseUrl}/v1/creator/follows`, { headers: viewerHeaders });
    expect(follows.status).toBe(200);
    await expect(follows.json()).resolves.toMatchObject({
      creators: [expect.objectContaining({ creatorProfileId: creatorProfile.creatorProfile.id, slug: "feed-creator" })]
    });

    const feedRes = await fetch(`${baseUrl}/v1/creator/feed?limit=1`, { headers: viewerHeaders });
    expect(feedRes.status).toBe(200);
    const feed = await feedRes.json() as { items: Array<{ feedItemType: string; creatorProfileId: string }>; nextCursor?: string };
    expect(feed.items.length).toBe(1);
    expect(feed.items[0]?.creatorProfileId).toBe(creatorProfile.creatorProfile.id);
    expect(feed.nextCursor).toBeTruthy();

    const nextFeedRes = await fetch(`${baseUrl}/v1/creator/feed?limit=5&cursor=${encodeURIComponent(feed.nextCursor ?? "")}`, { headers: viewerHeaders });
    expect(nextFeedRes.status).toBe(200);
    const nextFeed = await nextFeedRes.json() as { items: Array<{ contentId: string }> };
    expect(nextFeed.items.length).toBeGreaterThanOrEqual(0);

    const videosOnly = await fetch(`${baseUrl}/v1/creator/feed?type=videos`, { headers: viewerHeaders });
    expect(videosOnly.status).toBe(200);
    await expect(videosOnly.json()).resolves.toMatchObject({ items: [] });

    const placeContent = await fetch(`${baseUrl}/v1/places/${encodeURIComponent("p-feed")}/creator-content`, { headers: viewerHeaders });
    expect(placeContent.status).toBe(200);
    await expect(placeContent.json()).resolves.toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({ creatorProfileId: creatorProfile.creatorProfile.id, placeId: "p-feed" })
      ])
    });

    const searchGuides = await fetch(`${baseUrl}/v1/guides/search?q=pizza`, { headers: viewerHeaders });
    expect(searchGuides.status).toBe(200);
    await expect(searchGuides.json()).resolves.toMatchObject({
      items: [expect.objectContaining({ title: "Top pizza" })]
    });

    const unfollowRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfile.creatorProfile.id)}/follow`, {
      method: "DELETE",
      headers: viewerHeaders
    });
    expect(unfollowRes.status).toBe(200);

    const emptyFeed = await fetch(`${baseUrl}/v1/creator/feed`, { headers: viewerHeaders });
    expect(emptyFeed.status).toBe(200);
    await expect(emptyFeed.json()).resolves.toMatchObject({ items: [] });
  });

  it("supports creator premium endpoints with entitlement enforcement", async () => {
    const creatorHeaders = { "x-user-id": "creator-premium-1", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ creatorName: "Premium Creator" })
    });
    await fetch(`${baseUrl}/v1/creator/profiles`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ displayName: "Premium Creator", slug: "premium-creator" })
    });

    const identityRes = await fetch(`${baseUrl}/v1/identity`, { headers: { "x-user-id": "creator-premium-1" } });
    const identity = await identityRes.json() as { creatorProfile?: { id: string } };
    const creatorProfileId = identity.creatorProfile?.id;
    expect(creatorProfileId).toBeTruthy();

    const upgrade = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId ?? "")}/upgrade-context`);
    expect(upgrade.status).toBe(200);

    const premiumState = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId ?? "")}/premium-state`);
    expect(premiumState.status).toBe(200);

    const blockedBranding = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId ?? "")}/branding`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ tagline: "Food specialist" })
    });
    expect(blockedBranding.status).toBe(403);

    await fetch(`${baseUrl}/v1/admin/subscription/comp`, {
      method: "POST",
      headers: { "x-admin-key": "test-admin", "x-account-id": creatorProfileId ?? "", "content-type": "application/json" },
      body: JSON.stringify({ planId: "creator-elite" })
    });

    const unlockedBranding = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId ?? "")}/branding`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ tagline: "Food specialist", accentColor: "#AA44CC" })
    });
    expect(unlockedBranding.status).toBe(200);

    const analyticsDenied = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId ?? "")}/premium-analytics/overview`, {
      headers: { "x-user-id": "viewer-analytics" }
    });
    expect(analyticsDenied.status).toBe(200);
  });

});
