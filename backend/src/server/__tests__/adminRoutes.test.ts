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


  it("exposes place quality monitoring endpoints and audits status actions", async () => {
    const ingest = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
      body: JSON.stringify({
        provider: "foursquare",
        rawPayload: {
          fsq_id: "missing-media-1",
          name: "No Media Cafe",
          geocodes: { main: { latitude: 37.77, longitude: -122.41 } },
          categories: [{ name: "Coffee Shop" }],
          description: "No description available"
        },
        fetchedAt: "2025-01-01T00:00:00.000Z"
      })
    });
    expect(ingest.status).toBe(201);

    const overview = await fetch(`${baseUrl}/v1/admin/place-quality/overview`, { headers: { "x-admin-key": "admin-secret" } });
    expect(overview.status).toBe(200);
    const overviewJson = await overview.json();
    expect(overviewJson.totalOpen).toBeGreaterThan(0);

    const issues = await fetch(`${baseUrl}/v1/admin/place-quality/issues?issueType=missing_photos`, { headers: { "x-admin-key": "admin-secret" } });
    expect(issues.status).toBe(200);
    const issuesJson = await issues.json();
    expect(issuesJson.total).toBeGreaterThan(0);
    const issueId = issuesJson.items[0].id as string;

    const detail = await fetch(`${baseUrl}/v1/admin/place-quality/issues/${encodeURIComponent(issueId)}`, { headers: { "x-admin-key": "admin-secret" } });
    expect(detail.status).toBe(200);

    const patch = await fetch(`${baseUrl}/v1/admin/place-quality/issues/${encodeURIComponent(issueId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-3" },
      body: JSON.stringify({ status: "resolved", note: "fixed through resync" })
    });
    expect(patch.status).toBe(200);
    const patchJson = await patch.json();
    expect(patchJson.status).toBe("resolved");

    const placeSummary = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(issuesJson.items[0].placeId)}/quality`, { headers: { "x-admin-key": "admin-secret" } });
    expect(placeSummary.status).toBe(200);

    const providerSummary = await fetch(`${baseUrl}/v1/admin/place-quality/providers`, { headers: { "x-admin-key": "admin-secret" } });
    expect(providerSummary.status).toBe(200);

    const audit = await fetch(`${baseUrl}/v1/admin/audit`, { headers: { "x-admin-key": "admin-secret" } });
    const auditJson = await audit.json();
    expect(auditJson.items.some((item: { actionType: string }) => item.actionType === "place_quality.resolved")).toBe(true);
  });


  it("supports duplicate review, merge, correction, and maintenance audit endpoints", async () => {
    const payloadA = {
      provider: "foursquare",
      rawPayload: {
        fsq_id: "dup-a",
        name: "Union Cafe",
        geocodes: { main: { latitude: 37.775, longitude: -122.414 } },
        categories: [{ name: "Coffee Shop" }],
        location: { formatted_address: "100 Market St, San Francisco" },
        tel: "+14155550111"
      }
    };
    const payloadB = {
      provider: "google",
      rawPayload: {
        id: "dup-b",
        displayName: { text: "Pier Gift Shop" },
        location: { latitude: 37.80, longitude: -122.40 },
        formattedAddress: "20 Pier Ave, San Francisco, CA",
        types: ["store"]
      }
    };

    const ingestA = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
      body: JSON.stringify(payloadA)
    });
    const ingestB = await fetch(`${baseUrl}/v1/admin/places/import-source`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret" },
      body: JSON.stringify(payloadB)
    });
    expect(ingestA.status).toBe(201);
    expect(ingestB.status).toBe(201);
    const ingestAJson = await ingestA.json();
    const ingestBJson = await ingestB.json();

    const alignSecond = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(ingestBJson.canonicalPlaceId)}/corrections`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
      body: JSON.stringify({
        reason: "prep_duplicate_review",
        updates: {
          primaryDisplayName: "Union Cafe SF",
          canonicalCategory: "coffee_shop",
          latitude: 37.77501,
          longitude: -122.41401
        }
      })
    });
    expect(alignSecond.status).toBe(200);

    const detect = await fetch(`${baseUrl}/v1/admin/places/duplicates:detect`, {
      method: "POST",
      headers: { "x-admin-key": "admin-secret" }
    });
    expect(detect.status).toBe(200);

    const candidates = await fetch(`${baseUrl}/v1/admin/places/duplicates`, { headers: { "x-admin-key": "admin-secret" } });
    const candidatesJson = await candidates.json();
    expect(candidatesJson.items.length).toBeGreaterThan(0);
    const candidateId = candidatesJson.items[0].id as string;

    const approve = await fetch(`${baseUrl}/v1/admin/places/duplicates/${encodeURIComponent(candidateId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
      body: JSON.stringify({ status: "approved", note: "same storefront" })
    });
    expect(approve.status).toBe(200);

    const placeIds = [ingestAJson.canonicalPlaceId as string, ingestBJson.canonicalPlaceId as string];
    const merge = await fetch(`${baseUrl}/v1/admin/places:merge`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
      body: JSON.stringify({ targetPlaceId: placeIds[0], sourcePlaceIds: [placeIds[1]], reason: "duplicate" })
    });
    expect(merge.status).toBe(200);

    const correction = await fetch(`${baseUrl}/v1/admin/places/${encodeURIComponent(placeIds[0])}/corrections`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-admin-key": "admin-secret", "x-user-id": "admin-merge" },
      body: JSON.stringify({ reason: "taxonomy_fix", updates: { canonicalCategory: "coffee_shop", primaryDisplayName: "Union Coffee" } })
    });
    expect(correction.status).toBe(200);

    const audits = await fetch(`${baseUrl}/v1/admin/places/maintenance/audit?placeId=${encodeURIComponent(placeIds[0])}`, { headers: { "x-admin-key": "admin-secret" } });
    expect(audits.status).toBe(200);
    const auditsJson = await audits.json();
    expect(auditsJson.items.some((item: { actionType: string }) => item.actionType === "merge")).toBe(true);
    expect(auditsJson.items.some((item: { actionType: string }) => item.actionType === "correction")).toBe(true);
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
