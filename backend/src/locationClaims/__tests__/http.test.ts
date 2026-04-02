import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../../server/index.js";

describe("location claims http endpoints", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = createServer();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("no server addr");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });

  it("accepts placeId as alias for locationId", async () => {
    const response = await fetch(`${baseUrl}/v1/location-claims/visits`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "u_http_test" },
      body: JSON.stringify({ placeId: "loc_seed_1", lat: 37.7749, lng: -122.4194, accuracyMeters: 10 })
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      visit: expect.objectContaining({ locationId: "loc_seed_1", state: "in_range" })
    });
  });

  it("trims incoming location ids to avoid false not-found errors", async () => {
    const response = await fetch(`${baseUrl}/v1/location-claims/visits`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-user-id": "u_http_test_trim" },
      body: JSON.stringify({ locationId: " loc_seed_1 ", lat: 37.7749, lng: -122.4194, accuracyMeters: 10 })
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      visit: expect.objectContaining({ locationId: "loc_seed_1", state: "in_range" })
    });
  });

  it("supports canonicalPlaceId for dynamic node claims", async () => {
    const headers = { "content-type": "application/json", "x-user-id": "u_http_dynamic" };
    const visitResponse = await fetch(`${baseUrl}/v1/location-claims/visits`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        canonicalPlaceId: "plc_http_dynamic_1",
        lat: 37.7749,
        lng: -122.4194,
        displayName: "Dynamic Place",
        category: "district",
        accuracyMeters: 10
      })
    });
    expect(visitResponse.status).toBe(201);
    const visitPayload = await visitResponse.json() as { visit: { id: string; locationId: string } };
    expect(visitPayload.visit.locationId.startsWith("loc_dyn_")).toBe(true);

    const prepareResponse = await fetch(`${baseUrl}/v1/location-claims/prepare`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        canonicalPlaceId: "plc_http_dynamic_1",
        visitId: visitPayload.visit.id
      })
    });
    expect(prepareResponse.status).toBe(200);
    const preparePayload = await prepareResponse.json() as { adGate: { id: string } };

    expect(preparePayload.adGate.id.startsWith("ad_")).toBe(true);
  });
});
