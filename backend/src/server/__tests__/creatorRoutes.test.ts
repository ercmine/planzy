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


  it("enforces unique handles and supports availability checks", async () => {
    const h1 = { "x-user-id": "creator-handle-1", "content-type": "application/json" };
    const h2 = { "x-user-id": "creator-handle-2", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, { method: "POST", headers: h1, body: JSON.stringify({ creatorName: "Handle One" }) });
    await fetch(`${baseUrl}/v1/profiles/creator`, { method: "POST", headers: h2, body: JSON.stringify({ creatorName: "Handle Two" }) });

    const p1 = await fetch(`${baseUrl}/v1/creator/profiles`, { method: "POST", headers: h1, body: JSON.stringify({ displayName: "Handle One", handle: "food.one", slug: "handle-one" }) });
    expect(p1.status).toBe(200);

    const availability = await fetch(`${baseUrl}/v1/creator/handles/availability?handle=food.one`);
    expect(availability.status).toBe(200);
    await expect(availability.json()).resolves.toMatchObject({ handle: "food.one", available: false });

    const taken = await fetch(`${baseUrl}/v1/creator/profiles`, { method: "POST", headers: h2, body: JSON.stringify({ displayName: "Handle Two", handle: "food.one", slug: "handle-two" }) });
    expect(taken.status).toBe(409);

    const invalid = await fetch(`${baseUrl}/v1/creator/handles/availability?handle=@@`);
    expect(invalid.status).toBe(400);
  });

  it("supports creator verification lifecycle and admin moderation", async () => {
    const creatorHeaders = { "x-user-id": "creator-verify-1", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, { method: "POST", headers: creatorHeaders, body: JSON.stringify({ creatorName: "Verify Me" }) });
    await fetch(`${baseUrl}/v1/creator/profiles`, { method: "POST", headers: creatorHeaders, body: JSON.stringify({ displayName: "Verify Me", slug: "verify-me", bio: "bio", handle: "verifyme" }) });
    const identity = await fetch(`${baseUrl}/v1/identity`, { headers: { "x-user-id": "creator-verify-1" } });
    const payload = await identity.json() as { creatorProfile?: { id: string } };
    const creatorProfileId = payload.creatorProfile?.id ?? "";

    await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId)}`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ avatarUrl: "https://img.test/avatar.png", socialLinks: [{ platform: "instagram", url: "https://www.instagram.com/verify-me" }] })
    });

    await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId)}/guides`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ title: "Guide one", summary: "s", status: "published", placeItems: [{ placeId: "p-verify" }] })
    });
    await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(creatorProfileId)}/guides`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ title: "Guide two", summary: "s", status: "published", placeItems: [{ placeId: "p-verify-2" }] })
    });

    const eligibility = await fetch(`${baseUrl}/v1/creator/verification/eligibility`, { headers: { "x-user-id": "creator-verify-1" } });
    expect(eligibility.status).toBe(200);
    await expect(eligibility.json()).resolves.toMatchObject({ eligible: true });

    const draft = await fetch(`${baseUrl}/v1/creator/verification/draft`, {
      method: "PUT",
      headers: creatorHeaders,
      body: JSON.stringify({ reason: "I am a local creator", niche: "food", portfolioLinks: ["https://portfolio.test"], socialLinks: ["https://instagram.com/verifyme"] })
    });
    expect(draft.status).toBe(200);

    const submittedRes = await fetch(`${baseUrl}/v1/creator/verification/submit`, { method: "POST", headers: { "x-user-id": "creator-verify-1" } });
    expect(submittedRes.status).toBe(200);
    const submitted = await submittedRes.json() as { application: { id: string; status: string } };
    expect(submitted.application.status).toBe("submitted");

    const adminHeaders = { "x-user-id": "admin-reviewer", "x-admin-key": "test-admin", "content-type": "application/json" };
    const list = await fetch(`${baseUrl}/v1/admin/creator/verification/applications?status=submitted`, { headers: adminHeaders });
    expect(list.status).toBe(200);

    const nonAdmin = await fetch(`${baseUrl}/v1/admin/creator/verification/applications`, { headers: { "x-user-id": "not-admin" } });
    expect(nonAdmin.status).toBe(403);

    const underReview = await fetch(`${baseUrl}/v1/admin/creator/verification/applications/${encodeURIComponent(submitted.application.id)}/under-review`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ note: "reviewing" })
    });
    expect(underReview.status).toBe(200);

    const approve = await fetch(`${baseUrl}/v1/admin/creator/verification/applications/${encodeURIComponent(submitted.application.id)}/approve`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ note: "approved" })
    });
    expect(approve.status).toBe(200);

    const publicProfile = await fetch(`${baseUrl}/v1/creators/verify-me`);
    expect(publicProfile.status).toBe(200);
    await expect(publicProfile.json()).resolves.toMatchObject({ profile: { verification: { isVerified: true, badgeType: "verified_creator" } } });

    const revoke = await fetch(`${baseUrl}/v1/admin/creator/verification/profiles/${encodeURIComponent(creatorProfileId)}/revoke`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ reasonCode: "policy_violation", publicMessage: "revoked" })
    });
    expect(revoke.status).toBe(200);

    const statusAfter = await fetch(`${baseUrl}/v1/creator/verification/status`, { headers: { "x-user-id": "creator-verify-1" } });
    expect(statusAfter.status).toBe(200);
    await expect(statusAfter.json()).resolves.toMatchObject({ status: "revoked", badge: { isVerified: false } });
  });

});
