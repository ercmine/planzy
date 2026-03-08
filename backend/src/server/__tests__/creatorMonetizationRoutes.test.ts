import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("creator monetization routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = "test-admin-key";
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("invalid address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("supports monetization profile, admin activation, tips, and premium guide locks", async () => {
    const creatorHeaders = { "x-user-id": "creator-monet-1", "content-type": "application/json" };
    await fetch(`${baseUrl}/v1/profiles/creator`, { method: "POST", headers: creatorHeaders, body: JSON.stringify({ creatorName: "Money Maker" }) });
    const profileRes = await fetch(`${baseUrl}/v1/creator/profiles`, { method: "POST", headers: creatorHeaders, body: JSON.stringify({ displayName: "Money Maker", slug: "money-maker" }) });
    const profile = await profileRes.json() as { profile: { id: string } };

    await fetch(`${baseUrl}/v1/subscription/change`, { method: "POST", headers: { "x-user-id": profile.profile.id, "x-account-type": "CREATOR", "content-type": "application/json" }, body: JSON.stringify({ targetPlanId: "creator-elite" }) });

    const adminStatus = await fetch(`${baseUrl}/v1/admin/creator/profiles/${encodeURIComponent(profile.profile.id)}/monetization`, {
      method: "PATCH",
      headers: { ...creatorHeaders, "x-admin-key": "test-admin-key" },
      body: JSON.stringify({ status: "active" })
    });
    expect(adminStatus.status).toBe(200);

    const settings = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(profile.profile.id)}/monetization`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ tippingEnabled: true, premiumContentEnabled: true, featuredPlacementOptIn: true })
    });
    expect(settings.status).toBe(200);

    const guideRes = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(profile.profile.id)}/guides`, {
      method: "POST",
      headers: creatorHeaders,
      body: JSON.stringify({ title: "VIP Guide", summary: "Members only", body: "full body", status: "published", placeItems: [{ placeId: "p1" }] })
    });
    const guide = await guideRes.json() as { guide: { id: string; slug: string } };

    const markPremium = await fetch(`${baseUrl}/v1/creator/profiles/${encodeURIComponent(profile.profile.id)}/guides/${encodeURIComponent(guide.guide.id)}/monetization`, {
      method: "PATCH",
      headers: creatorHeaders,
      body: JSON.stringify({ mode: "premium", previewSummary: "locked preview" })
    });
    expect(markPremium.status).toBe(200);

    const tipIntent = await fetch(`${baseUrl}/v1/creator/tips/intents`, {
      method: "POST",
      headers: { "x-user-id": "viewer-tip-1", "content-type": "application/json" },
      body: JSON.stringify({ creatorProfileId: profile.profile.id, amountMinor: 500, note: "great work" })
    });
    expect(tipIntent.status).toBe(201);

    const lockedGuide = await fetch(`${baseUrl}/v1/creators/money-maker/guides/${encodeURIComponent(guide.guide.slug)}`, { headers: { "x-user-id": "viewer-tip-1" } });
    expect(lockedGuide.status).toBe(200);
    await expect(lockedGuide.json()).resolves.toMatchObject({ guide: { body: "", monetization: { mode: "premium" } } });
  });
});
