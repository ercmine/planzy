import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("identity and acting context routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("invalid address");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("returns identity summary and contexts", async () => {
    const headers = { "x-user-id": "person-a" };
    const identityRes = await fetch(`${baseUrl}/v1/identity`, { headers });
    expect(identityRes.status).toBe(200);
    await expect(identityRes.json()).resolves.toMatchObject({
      user: { id: "person-a", activeProfileType: "PERSONAL" },
      personalProfile: { userId: "person-a" }
    });

    const creatorRes = await fetch(`${baseUrl}/v1/profiles/creator`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ creatorName: "Creator A" })
    });
    expect(creatorRes.status).toBe(201);

    const contextsRes = await fetch(`${baseUrl}/v1/identity/contexts`, { headers });
    expect(contextsRes.status).toBe(200);
    await expect(contextsRes.json()).resolves.toMatchObject({
      contexts: expect.arrayContaining([
        expect.objectContaining({ profileType: "PERSONAL" }),
        expect.objectContaining({ profileType: "CREATOR" })
      ])
    });
  });

  it("prevents non-members from listing business members", async () => {
    const ownerHeaders = { "x-user-id": "owner-a", "content-type": "application/json" };
    const createdBiz = await fetch(`${baseUrl}/v1/profiles/business`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ businessName: "Owner Biz", slug: "owner-biz" })
    });
    const bizData = await createdBiz.json() as { profile: { id: string } };

    const outsiderRes = await fetch(`${baseUrl}/v1/business-profiles/${encodeURIComponent(bizData.profile.id)}/members`, {
      headers: { "x-user-id": "outsider" }
    });
    expect(outsiderRes.status).toBe(403);
    await expect(outsiderRes.json()).resolves.toMatchObject({ error: "BUSINESS_CONTEXT_NOT_ALLOWED" });
  });

  it("enforces business reply context when posting as business member", async () => {
    const ownerHeaders = { "x-user-id": "reply-owner", "content-type": "application/json" };
    const bizRes = await fetch(`${baseUrl}/v1/profiles/business`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ businessName: "Reply Biz", slug: "reply-biz" })
    });
    const biz = await bizRes.json() as { profile: { id: string } };

    const inviteViewer = await fetch(`${baseUrl}/v1/business-profiles/${encodeURIComponent(biz.profile.id)}/members`, {
      method: "POST",
      headers: ownerHeaders,
      body: JSON.stringify({ userId: "reply-viewer", role: "VIEWER" })
    });
    expect(inviteViewer.status).toBe(201);

    const blocked = await fetch(`${baseUrl}/places/p1/reviews`, {
      method: "POST",
      headers: {
        "x-user-id": "reply-viewer",
        "x-acting-profile-type": "BUSINESS",
        "x-acting-profile-id": biz.profile.id,
        "content-type": "application/json"
      },
      body: JSON.stringify({ rating: 5, text: "Not allowed as viewer", displayName: "Viewer" })
    });
    expect(blocked.status).toBe(403);

    const allowed = await fetch(`${baseUrl}/places/p1/reviews`, {
      method: "POST",
      headers: {
        "x-user-id": "reply-owner",
        "x-acting-profile-type": "BUSINESS",
        "x-acting-profile-id": biz.profile.id,
        "content-type": "application/json"
      },
      body: JSON.stringify({ rating: 5, text: "Allowed business reply", displayName: "Owner" })
    });

    expect(allowed.status).toBe(201);
    const payload = await allowed.json() as { review: { actingProfileType: string; actingProfileId: string; userId: string } };
    expect(payload.review).toMatchObject({
      actingProfileType: "BUSINESS",
      actingProfileId: biz.profile.id,
      userId: "reply-owner"
    });
  });
});
