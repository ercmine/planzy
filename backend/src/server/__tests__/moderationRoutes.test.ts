import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("moderation routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.ADMIN_API_KEY = "admin-secret";
    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("failed to bind server");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    delete process.env.ADMIN_API_KEY;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) return reject(error);
        resolve();
      });
    });
  });

  it("creates moderation reports and serves admin queue/details", async () => {
    const createReview = await fetch(`${baseUrl}/places/place-1/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "author-1" },
      body: JSON.stringify({ text: "Bad service but legit feedback", rating: 2, displayName: "A" })
    });
    expect(createReview.status).toBe(201);
    const payload = await createReview.json();
    const reviewId = payload.review.id as string;

    const report = await fetch(`${baseUrl}/v1/moderation/reports`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "reporter-1" },
      body: JSON.stringify({ targetType: "review", targetId: reviewId, reviewId, reasonCode: "misleading_fake_review", note: "looks suspicious" })
    });
    expect(report.status).toBe(202);

    const queueUnauthorized = await fetch(`${baseUrl}/v1/admin/moderation/queue`);
    expect(queueUnauthorized.status).toBe(401);

    const queue = await fetch(`${baseUrl}/v1/admin/moderation/queue`, { headers: { "x-admin-key": "admin-secret" } });
    expect(queue.status).toBe(200);
    const queueJson = await queue.json();
    expect(Array.isArray(queueJson.queue)).toBe(true);
    expect(queueJson.queue.length).toBeGreaterThan(0);

    const details = await fetch(`${baseUrl}/v1/admin/moderation/targets/review/${encodeURIComponent(reviewId)}`, { headers: { "x-admin-key": "admin-secret" } });
    expect(details.status).toBe(200);
    const detailsJson = await details.json();
    expect(detailsJson.reports.length).toBeGreaterThan(0);
  });

  it("allows reversible admin decisions that affect visibility", async () => {
    const createReview = await fetch(`${baseUrl}/places/place-2/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "author-2" },
      body: JSON.stringify({ text: "This is a normal negative review and should remain.", rating: 2, displayName: "B" })
    });
    const created = await createReview.json();
    const reviewId = created.review.id as string;

    const hide = await fetch(`${baseUrl}/v1/admin/moderation/decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-1" },
      body: JSON.stringify({ targetType: "review", targetId: reviewId, reviewId, decisionType: "hide", reasonCode: "policy_violation" })
    });
    expect(hide.status).toBe(200);

    const listAfterHide = await fetch(`${baseUrl}/places/place-2/reviews`);
    const hiddenList = await listAfterHide.json();
    expect(hiddenList.reviews.some((item: { id: string }) => item.id === reviewId)).toBe(false);

    const restore = await fetch(`${baseUrl}/v1/admin/moderation/decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-1" },
      body: JSON.stringify({ targetType: "review", targetId: reviewId, reviewId, decisionType: "restore", reasonCode: "appeal_upheld" })
    });
    expect(restore.status).toBe(200);

    const listAfterRestore = await fetch(`${baseUrl}/places/place-2/reviews`);
    const restoredList = await listAfterRestore.json();
    expect(restoredList.reviews.some((item: { id: string }) => item.id === reviewId)).toBe(true);
  });
});
