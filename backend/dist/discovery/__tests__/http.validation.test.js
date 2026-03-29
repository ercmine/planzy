import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../server/index.js";
describe("discovery http validation", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const addr = server.address();
        if (!addr || typeof addr === "string")
            throw new Error("no addr");
        baseUrl = `http://127.0.0.1:${addr.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    });
    it("returns 400 for bad nearby lat/lng", async () => {
        const response = await fetch(`${baseUrl}/v1/discovery/nearby?lat=100&lng=200`);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "invalid_lat" });
    });
    it("returns 400 for malformed category browse", async () => {
        const response = await fetch(`${baseUrl}/v1/discovery/browse?city=austin`);
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: "category_search_requires_category" });
    });
});
