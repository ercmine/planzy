import { createServer as createNodeServer, type IncomingMessage, type Server as NodeServer } from "node:http";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("server diagnostic and alias routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let googleMockServer: NodeServer;
  let googleBaseUrl: string;

  beforeAll(async () => {
    googleMockServer = createNodeServer((req: IncomingMessage, res) => {
      const reqUrl = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "POST" && reqUrl.pathname === "/v1/places:searchNearby") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            places: [
              {
                id: "abc",
                displayName: { text: "Coffee Place" },
                location: { latitude: 44.85, longitude: -93.54 },
                rating: 4.6,
                userRatingCount: 100,
                photos: [{ name: "places/abc/photos/def" }]
              }
            ]
          })
        );
        return;
      }


      if (req.method === "GET" && reqUrl.pathname === "/v1/places/abc") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            id: "abc",
            displayName: { text: "Coffee Place" },
            editorialSummary: { text: "Great beans and cozy seating." },
            formattedAddress: "123 Main",
            location: { latitude: 44.85, longitude: -93.54 },
            photos: [{ name: "places/abc/photos/def" }, { name: "places/abc/photos/ghi" }]
          })
        );
        return;
      }

      if (req.method === "GET" && reqUrl.pathname === "/v1/places/abc/photos/def/media") {
        res.statusCode = 200;
        res.setHeader("content-type", "image/jpeg");
        res.end(Buffer.from([255, 216, 255, 217]));
        return;
      }

      res.statusCode = 404;
      res.end("not_found");
    });

    await new Promise<void>((resolve) => {
      googleMockServer.listen(0, "127.0.0.1", () => resolve());
    });

    const googleAddress = googleMockServer.address();
    if (!googleAddress || typeof googleAddress === "string") {
      throw new Error("Google mock did not bind to an expected address");
    }

    googleBaseUrl = `http://127.0.0.1:${googleAddress.port}`;
    process.env.GOOGLE_PLACES_NEARBY_ENDPOINT = `${googleBaseUrl}/v1/places:searchNearby`;
    process.env.GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL = `${googleBaseUrl}/v1`;
    process.env.GOOGLE_PLACES_DETAILS_ENDPOINT_BASE = `${googleBaseUrl}/v1/places`;

    server = createServer();
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Server did not bind to an expected address");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    delete process.env.GOOGLE_PLACES_NEARBY_ENDPOINT;
    delete process.env.GOOGLE_PLACES_PHOTO_MEDIA_BASE_URL;
    delete process.env.GOOGLE_PLACES_DETAILS_ENDPOINT_BASE;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await new Promise<void>((resolve, reject) => {
      googleMockServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.GOOGLE_MAPS_API_KEY;
  });

  it("serves root and health diagnostics", async () => {
    const rootResponse = await fetch(`${baseUrl}/`);
    expect(rootResponse.status).toBe(200);
    await expect(rootResponse.json()).resolves.toMatchObject({
      service: "perbug-api",
      version: "1.0.0"
    });

    const healthResponse = await fetch(`${baseUrl}/health`);
    expect(healthResponse.status).toBe(200);
    await expect(healthResponse.json()).resolves.toMatchObject({
      ok: true,
      service: "perbug-api",
      version: "1.0.0"
    });
  });


  it("serves discovery API contracts", async () => {
    const searchRes = await fetch(`${baseUrl}/v1/discovery/search?q=coffee&city=austin&pageSize=2`);
    expect(searchRes.status).toBe(200);
    await expect(searchRes.json()).resolves.toMatchObject({
      query: expect.any(Object),
      items: expect.any(Array)
    });

    const cityRes = await fetch(`${baseUrl}/v1/discovery/cities/austin`);
    expect(cityRes.status).toBe(200);
    await expect(cityRes.json()).resolves.toMatchObject({
      city: expect.objectContaining({ slug: "austin" }),
      sections: expect.any(Array)
    });

    const feedRes = await fetch(`${baseUrl}/v1/discovery/feed?mode=trending&city=austin`);
    expect(feedRes.status).toBe(200);
    await expect(feedRes.json()).resolves.toMatchObject({
      mode: "trending",
      items: expect.any(Array)
    });
  });

  it("serves plans and live-results under bare and /api aliases", async () => {
    const planResponse = await fetch(`${baseUrl}/plans?lat=44.85&lng=-93.54&category=coffee`);
    expect(planResponse.status).toBe(200);
    await expect(planResponse.json()).resolves.toMatchObject([
      {
        source: "google",
        id: "google:abc",
        title: "Coffee Place",
        photo: "places/abc/photos/def",
        photoUrl: "https://api.perbug.com/photo?name=places%2Fabc%2Fphotos%2Fdef&maxWidthPx=800"
      }
    ]);

    const liveResultsResponse = await fetch(`${baseUrl}/live-results?lat=44.85&lng=-93.54&category=coffee`);
    expect(liveResultsResponse.status).toBe(200);
    await expect(liveResultsResponse.json()).resolves.toMatchObject({
      results: expect.any(Array),
      summary: expect.any(Object)
    });

    const apiHealthResponse = await fetch(`${baseUrl}/api/health`);
    expect(apiHealthResponse.status).toBe(200);

    const apiPlansResponse = await fetch(`${baseUrl}/api/plans?lat=44.85&lng=-93.54`);
    expect(apiPlansResponse.status).toBe(200);

    const v1PlansResponse = await fetch(`${baseUrl}/v1/plans?lat=44.85&lng=-93.54`);
    expect(v1PlansResponse.status).toBe(200);
  });


  it("serves place details and per-place reviews", async () => {
    const detailResponse = await fetch(`${baseUrl}/places/abc`);
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      id: "abc",
      description: "Great beans and cozy seating.",
      photos: expect.arrayContaining([
        expect.objectContaining({ name: "places/abc/photos/def" }),
        expect.objectContaining({ name: "places/abc/photos/ghi" })
      ])
    });

    const createResponse = await fetch(`${baseUrl}/places/abc/reviews`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "user-1"
      },
      body: JSON.stringify({ rating: 5, text: "Loved it", displayName: "Alex", anonymous: false })
    });
    expect(createResponse.status).toBe(201);

    const listResponse = await fetch(`${baseUrl}/places/abc/reviews`);
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      reviews: [expect.objectContaining({ rating: 5, text: "Loved it", author: expect.objectContaining({ displayName: "Alex" }) })]
    });
  });


  it("proxies Google Places photos and returns cache headers", async () => {
    const response = await fetch(`${baseUrl}/photo?name=places/abc/photos/def&maxWidthPx=800&maxHeightPx=800`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("public, max-age=86400");
    expect((await response.arrayBuffer()).byteLength).toBe(4);
  });

  it("returns photo_not_available for invalid photos requests", async () => {
    const response = await fetch(`${baseUrl}/photo?name=invalid-photo-name`);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "invalid_photo_name"
    });
  });

  it("returns helpful error when google maps key is missing", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const response = await fetch(`${baseUrl}/plans?lat=44.85&lng=-93.54&category=coffee`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "missing_api_key"
    });
  });
});
