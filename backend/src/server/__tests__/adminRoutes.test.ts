import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("admin operations routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = "admin-secret";
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("failed to bind server");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    delete process.env.ADMIN_API_KEY;
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  it("returns overview, moderation queue, and audit trail", async () => {
    const createReview = await fetch(`${baseUrl}/places/place-admin-1/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "author-admin-1" },
      body: JSON.stringify({ text: "spam spam dm me on telegram for discount", rating: 1, displayName: "User A" })
    });
    expect(createReview.status).toBe(201);
    const reviewPayload = await createReview.json();
    const reviewId = reviewPayload.review.id as string;

    const report = await fetch(`${baseUrl}/v1/moderation/reports`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "reporter-admin-1" },
      body: JSON.stringify({ targetType: "review", targetId: reviewId, reasonCode: "spam" })
    });
    expect(report.status).toBe(202);

    const overview = await fetch(`${baseUrl}/v1/admin/overview`, { headers: { "x-admin-key": "admin-secret", "x-user-id": "admin-1" } });
    expect(overview.status).toBe(200);
    const overviewJson = await overview.json();
    expect(overviewJson.moderation.openReports).toBeGreaterThan(0);
    expect(overviewJson.sourceHealth).toBeDefined();

    const queue = await fetch(`${baseUrl}/v1/admin/moderation/queue`, { headers: { "x-admin-key": "admin-secret" } });
    expect(queue.status).toBe(200);
    const queueJson = await queue.json();
    expect(Array.isArray(queueJson.queue)).toBe(true);

    const action = await fetch(`${baseUrl}/v1/admin/moderation/actions`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-1" },
      body: JSON.stringify({ target: { targetType: "review", targetId: reviewId, reviewId }, decisionType: "hide", reasonCode: "policy_violation", notes: "confirmed spam" })
    });
    expect(action.status).toBe(200);

    const audit = await fetch(`${baseUrl}/v1/admin/audit`, { headers: { "x-admin-key": "admin-secret" } });
    expect(audit.status).toBe(200);
    const auditJson = await audit.json();
    expect(auditJson.items.length).toBeGreaterThan(0);
  });

  it("supports user suspension workflow", async () => {
    const suspend = await fetch(`${baseUrl}/v1/admin/users/user-to-suspend/suspend`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-2" },
      body: JSON.stringify({ reasonCode: "fraud_risk" })
    });
    expect(suspend.status).toBe(200);

    const users = await fetch(`${baseUrl}/v1/admin/users?search=user-to-suspend`, { headers: { "x-admin-key": "admin-secret" } });
    const usersJson = await users.json();
    expect(usersJson.items[0].status).toBe("SUSPENDED");

    const reinstate = await fetch(`${baseUrl}/v1/admin/users/user-to-suspend/reinstate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-2" },
      body: JSON.stringify({ reasonCode: "appeal_upheld" })
    });
    expect(reinstate.status).toBe(200);
  });
});
