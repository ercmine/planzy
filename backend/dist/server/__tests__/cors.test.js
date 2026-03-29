import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("CORS policy", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        server = createServer();
        await new Promise((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve());
        });
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("Server did not bind to an expected address");
        }
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    });
    beforeEach(() => {
        process.env.CORS_ALLOWED_ORIGINS = "https://app.dryad.dev,http://localhost:5173";
        process.env.CORS_ALLOW_CREDENTIALS = "true";
        process.env.CORS_ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
        process.env.CORS_ALLOWED_HEADERS = "Content-Type,Authorization,x-user-id,x-request-id,x-acting-profile-type,x-acting-profile-id,x-admin-key";
        process.env.CORS_EXPOSE_HEADERS = "x-request-id";
        process.env.CORS_MAX_AGE_SECONDS = "600";
    });
    it("allows approved origins on normal requests", async () => {
        const response = await fetch(`${baseUrl}/api/geo/health`, {
            headers: { Origin: "https://app.dryad.dev" }
        });
        expect([200, 503]).toContain(response.status);
        expect(response.headers.get("access-control-allow-origin")).toBe("https://app.dryad.dev");
        expect(response.headers.get("access-control-allow-credentials")).toBe("true");
        expect(response.headers.get("access-control-expose-headers")).toContain("x-request-id");
        expect(response.headers.get("vary")).toContain("Origin");
    });
    it("does not grant CORS for disallowed origins", async () => {
        const response = await fetch(`${baseUrl}/health`, {
            headers: { Origin: "https://evil.example.com" }
        });
        expect(response.status).toBe(200);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
        expect(response.headers.get("vary")).toContain("Origin");
    });
    it("keeps non-browser requests working when Origin is absent", async () => {
        const response = await fetch(`${baseUrl}/health`);
        expect(response.status).toBe(200);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });
    it("handles approved preflight requests", async () => {
        const response = await fetch(`${baseUrl}/api/geo/search`, {
            method: "OPTIONS",
            headers: {
                Origin: "https://app.dryad.dev",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type,x-user-id,x-request-id"
            }
        });
        expect(response.status).toBe(204);
        expect(response.headers.get("access-control-allow-origin")).toBe("https://app.dryad.dev");
        expect(response.headers.get("access-control-allow-methods")).toContain("GET");
        expect(response.headers.get("access-control-allow-headers")).toBe("content-type, x-user-id, x-request-id");
        expect(response.headers.get("access-control-max-age")).toBe("600");
        expect(response.headers.get("vary")).toContain("Origin");
        expect(response.headers.get("vary")).toContain("Access-Control-Request-Method");
        expect(response.headers.get("vary")).toContain("Access-Control-Request-Headers");
    });
    it("rejects preflight from disallowed origins", async () => {
        const response = await fetch(`${baseUrl}/api/geo/search`, {
            method: "OPTIONS",
            headers: {
                Origin: "https://evil.example.com",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "content-type"
            }
        });
        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toMatchObject({ error: "CORS origin not allowed" });
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });
    it("keeps CORS headers on error responses for allowed origins", async () => {
        const response = await fetch(`${baseUrl}/v1/admin/promoted`, {
            headers: { Origin: "https://app.dryad.dev" }
        });
        expect(response.status).toBe(401);
        expect(response.headers.get("access-control-allow-origin")).toBe("https://app.dryad.dev");
    });
    it("keeps CORS headers on not-found responses for allowed origins", async () => {
        const response = await fetch(`${baseUrl}/api/this-route-does-not-exist`, {
            headers: { Origin: "https://app.dryad.dev" }
        });
        expect(response.status).toBe(404);
        expect(response.headers.get("access-control-allow-origin")).toBe("https://app.dryad.dev");
    });
});
