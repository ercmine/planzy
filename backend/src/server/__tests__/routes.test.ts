import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createServer } from "../index.js";

describe("server diagnostic and alias routes", () => {
  let server: ReturnType<typeof createServer>;
  let baseUrl: string;

  beforeAll(async () => {
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
      service: "perbug-api"
    });
  });

  it("serves plans and live-results under bare and /api aliases", async () => {
    const planResponse = await fetch(`${baseUrl}/plans`);
    expect(planResponse.status).toBe(200);
    await expect(planResponse.json()).resolves.toBeInstanceOf(Array);

    const liveResultsResponse = await fetch(`${baseUrl}/live-results`);
    expect(liveResultsResponse.status).toBe(200);
    await expect(liveResultsResponse.json()).resolves.toMatchObject({
      results: expect.any(Array),
      summary: expect.any(Object)
    });

    const apiHealthResponse = await fetch(`${baseUrl}/api/health`);
    expect(apiHealthResponse.status).toBe(200);

    const apiPlansResponse = await fetch(`${baseUrl}/api/plans`);
    expect(apiPlansResponse.status).toBe(200);

    const v1PlansResponse = await fetch(`${baseUrl}/v1/plans`);
    expect(v1PlansResponse.status).toBe(200);
  });
});
