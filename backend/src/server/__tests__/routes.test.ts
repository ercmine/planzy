import { createServer as createNodeServer, type Server as NodeServer } from "node:http";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("server diagnostic and alias routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;
  let googleMockServer: NodeServer;
  let googleBaseUrl: string;

  beforeAll(async () => {
    googleMockServer = createNodeServer((_req, res) => {
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
              userRatingCount: 100
            }
          ]
        })
      );
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

  it("serves plans and live-results under bare and /api aliases", async () => {
    const planResponse = await fetch(`${baseUrl}/plans?lat=44.85&lng=-93.54&category=coffee`);
    expect(planResponse.status).toBe(200);
    await expect(planResponse.json()).resolves.toMatchObject([
      {
        source: "google",
        id: "google:abc",
        title: "Coffee Place"
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

  it("returns helpful error when google maps key is missing", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;

    const response = await fetch(`${baseUrl}/plans?lat=44.85&lng=-93.54&category=coffee`);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "missing_api_key"
    });
  });
});
