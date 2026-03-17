import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("accomplishments routes", () => {
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

  it("returns catalog, tracks progress, and supports featured badges", async () => {
    const headers = { "x-user-id": "acc-user-1", "content-type": "application/json" };

    const catalogRes = await fetch(`${baseUrl}/v1/accomplishments/catalog`, { headers: { "x-user-id": "acc-user-1" } });
    expect(catalogRes.status).toBe(200);
    const catalog = await catalogRes.json() as { definitions: Array<{ id: string }> };
    expect(catalog.definitions.length).toBeGreaterThan(0);

    const eventRes = await fetch(`${baseUrl}/v1/accomplishments/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId: "evt-1", type: "review_created", canonicalPlaceId: "plc-c1", cityId: "city-downtown", contributionState: "published" })
    });
    expect(eventRes.status).toBe(200);

    await fetch(`${baseUrl}/v1/accomplishments/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId: "evt-2", type: "review_created", canonicalPlaceId: "plc-c2", cityId: "city-downtown", contributionState: "published" })
    });
    await fetch(`${baseUrl}/v1/accomplishments/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId: "evt-3", type: "review_created", canonicalPlaceId: "plc-c3", cityId: "city-downtown", contributionState: "published" })
    });

    const summaryRes = await fetch(`${baseUrl}/v1/accomplishments/summary`, { headers: { "x-user-id": "acc-user-1" } });
    expect(summaryRes.status).toBe(200);
    const summary = await summaryRes.json() as { earned: Array<{ id: string }>; collectibles: Record<string, string[]> };
    expect(summary.earned.some((item) => item.id === "coffee-crawl-downtown")).toBe(true);

    const featureRes = await fetch(`${baseUrl}/v1/accomplishments/featured`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ badgeIds: ["first-footprint", "coffee-crawl-downtown"] })
    });
    expect(featureRes.status).toBe(200);
    await expect(featureRes.json()).resolves.toMatchObject({ featured: ["first-footprint", "coffee-crawl-downtown"] });
  });
});
