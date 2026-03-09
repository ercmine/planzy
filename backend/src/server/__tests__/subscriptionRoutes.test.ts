import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("subscription routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Server did not bind to expected address");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("serves subscription, plans, and preview routes", async () => {
    const headers = {
      "x-user-id": "sub-user-1",
      "x-account-type": "USER"
    };

    const sub = await fetch(`${baseUrl}/v1/subscription`, { headers });
    expect(sub.status).toBe(200);

    const plans = await fetch(`${baseUrl}/v1/subscription/plans`, { headers });
    expect(plans.status).toBe(200);
    await expect(plans.json()).resolves.toMatchObject({
      plans: expect.arrayContaining([expect.objectContaining({ id: "user-free" })])
    });

    const preview = await fetch(`${baseUrl}/v1/subscription/preview-upgrade?targetPlanId=user-pro`, { headers });
    expect(preview.status).toBe(200);
    await expect(preview.json()).resolves.toMatchObject({
      preview: expect.objectContaining({ allowed: true, toPlanId: "user-pro" })
    });
  });


  it("returns entitlement summary contract with features and quotas", async () => {
    const headers = {
      "x-user-id": "summary-user-1",
      "x-account-type": "USER"
    };

    const response = await fetch(`${baseUrl}/v1/entitlements/summary?targetType=USER`, { headers });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      context: {
        userId: "summary-user-1",
        targetType: "USER",
        plan: expect.objectContaining({ code: expect.any(String) })
      },
      ads: {
        adsEnabled: expect.any(Boolean),
        adsLevel: expect.any(String)
      },
      features: expect.arrayContaining([
        expect.objectContaining({ key: "reviews.write", allowed: expect.any(Boolean) })
      ]),
      quotas: expect.arrayContaining([
        expect.objectContaining({ key: "quota.lists.saved_lists", used: expect.any(Number), remaining: expect.any(Number) })
      ])
    });
  });

  it("blocks paid AI itinerary feature for free user with structured reason", async () => {
    const response = await fetch(`${baseUrl}/v1/subscription/authorize?action=generate_ai_itinerary`, {
      headers: {
        "x-user-id": "sub-user-2",
        "x-account-type": "USER"
      }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      decision: {
        allowed: false,
        reasonCode: "FEATURE_NOT_IN_PLAN"
      }
    });
  });

  it("enforces review quota on server", async () => {
    const headers = {
      "x-user-id": "quota-user",
      "x-account-type": "USER",
      "content-type": "application/json"
    };

    for (let index = 0; index < 10; index += 1) {
      const response = await fetch(`${baseUrl}/places/abc/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({ rating: 5, text: `Great place ${index}`, displayName: "Q", anonymous: false })
      });
      expect(response.status).toBe(201);
    }

    const blocked = await fetch(`${baseUrl}/places/abc/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ rating: 5, text: "Great place 11", displayName: "Q", anonymous: false })
    });

    expect(blocked.status).toBe(403);
    await expect(blocked.json()).resolves.toMatchObject({
      error: "USAGE_LIMIT_REACHED"
    });
  });
});
