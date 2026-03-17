import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("challenge routes", () => {
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

  it("lists, progresses, and reads challenge details", async () => {
    const headers = { "x-user-id": "challenge-user", "content-type": "application/json" };
    const listRes = await fetch(`${baseUrl}/v1/challenges?cityId=city-minneapolis`, { headers: { "x-user-id": "challenge-user" } });
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as { challenges: Array<{ id: string }> };
    expect(list.challenges.length).toBeGreaterThan(0);

    const eventRes = await fetch(`${baseUrl}/v1/challenges/events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        eventId: "c-evt-1",
        type: "place_saved",
        canonicalPlaceId: "pl-1",
        cityId: "city-minneapolis",
        categoryIds: ["coffee"]
      })
    });
    expect(eventRes.status).toBe(200);

    const detailRes = await fetch(`${baseUrl}/v1/challenges/city-coffee-explorer`, { headers: { "x-user-id": "challenge-user" } });
    expect(detailRes.status).toBe(200);
    const detail = await detailRes.json() as { progress: { criteria: Array<{ current: number }> } };
    expect(detail.progress.criteria[0]?.current).toBe(1);

    const summaryRes = await fetch(`${baseUrl}/v1/challenges/summary`, { headers: { "x-user-id": "challenge-user" } });
    expect(summaryRes.status).toBe(200);
  });
});
