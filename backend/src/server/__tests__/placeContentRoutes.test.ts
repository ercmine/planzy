import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("place content routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("bad bind");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("creates first-party content and returns place-linked aggregates", async () => {
    const headers = { "x-user-id": "content-user", "content-type": "application/json" };

    expect((await fetch(`${baseUrl}/v1/place-content/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ canonicalPlaceId: "cp_route_1", body: "Loved it", rating: 5 })
    })).status).toBe(201);

    expect((await fetch(`${baseUrl}/v1/place-content/videos`, {
      method: "POST",
      headers,
      body: JSON.stringify({ canonicalPlaceId: "cp_route_1", mediaAssetId: "media-1", title: "Clip" })
    })).status).toBe(201);

    expect((await fetch(`${baseUrl}/v1/place-content/saves`, {
      method: "POST",
      headers,
      body: JSON.stringify({ canonicalPlaceId: "cp_route_1", sourceContext: "search" })
    })).status).toBe(200);

    const guideRes = await fetch(`${baseUrl}/v1/place-content/guides`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title: "Best of city", visibility: "public" })
    });
    expect(guideRes.status).toBe(201);
    const guide = await guideRes.json() as { guide: { id: string } };

    expect((await fetch(`${baseUrl}/v1/place-content/guides/${guide.guide.id}/places`, {
      method: "POST",
      headers,
      body: JSON.stringify({ canonicalPlaceId: "cp_route_1" })
    })).status).toBe(200);

    const place = await fetch(`${baseUrl}/v1/place-content/places/cp_route_1`);
    expect(place.status).toBe(200);
    await expect(place.json()).resolves.toMatchObject({
      reviews: [expect.objectContaining({ canonicalPlaceId: "cp_route_1" })],
      videos: [expect.objectContaining({ canonicalPlaceId: "cp_route_1" })],
      saveCount: 1,
      guides: [expect.objectContaining({ id: guide.guide.id })],
      rankingBoost: expect.objectContaining({ cappedTotalBoost: expect.any(Number) })
    });
  });
});
