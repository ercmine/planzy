import { createServer as createNodeServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../../server/index.js";
describe("geocoding http endpoints", () => {
    let server;
    let nominatimServer;
    let baseUrl;
    beforeAll(async () => {
        nominatimServer = createNodeServer((req, res) => {
            const url = new URL(req.url ?? "/", "http://127.0.0.1");
            if (url.pathname === "/search") {
                res.statusCode = 200;
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify([{ display_name: "Austin, Texas", lat: "30.2672", lon: "-97.7431", address: { city: "Austin", state: "Texas", country: "United States", country_code: "us" } }]));
                return;
            }
            if (url.pathname === "/reverse") {
                res.statusCode = 200;
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify({ display_name: "Austin, Texas", lat: "30.2672", lon: "-97.7431", address: { city: "Austin", state: "Texas", country: "United States", country_code: "us" } }));
                return;
            }
            if (url.pathname === "/status") {
                res.statusCode = 200;
                res.end("ok");
                return;
            }
            res.statusCode = 404;
            res.end("not_found");
        });
        await new Promise((resolve) => nominatimServer.listen(0, "127.0.0.1", () => resolve()));
        const addr = nominatimServer.address();
        if (!addr || typeof addr === "string")
            throw new Error("no addr");
        process.env.NOMINATIM_BASE_URL = `http://127.0.0.1:${addr.port}`;
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const srvAddr = server.address();
        if (!srvAddr || typeof srvAddr === "string")
            throw new Error("no server addr");
        baseUrl = `http://127.0.0.1:${srvAddr.port}`;
    });
    afterAll(async () => {
        delete process.env.NOMINATIM_BASE_URL;
        await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
        await new Promise((resolve, reject) => nominatimServer.close((err) => err ? reject(err) : resolve()));
    });
    it("serves geocode and reverse geocode", async () => {
        const geocode = await fetch(`${baseUrl}/v1/geocode?q=austin`);
        expect(geocode.status).toBe(200);
        await expect(geocode.json()).resolves.toMatchObject({ results: [expect.objectContaining({ city: "Austin" })] });
        const reverse = await fetch(`${baseUrl}/v1/reverse-geocode?lat=30.2672&lng=-97.7431`);
        expect(reverse.status).toBe(200);
        await expect(reverse.json()).resolves.toMatchObject({ result: expect.objectContaining({ city: "Austin" }) });
        const health = await fetch(`${baseUrl}/v1/geocoding/health`);
        expect(health.status).toBe(200);
    });
});
