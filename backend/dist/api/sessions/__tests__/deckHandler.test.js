import { describe, expect, it } from "vitest";
import { ProviderError } from "../../../plans/errors.js";
import { createDeckHandler } from "../deckHandler.js";
function createMockResponse() {
    const headers = {};
    return {
        statusCode: 200,
        headers,
        setHeader(name, value) {
            headers[name.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value);
            return this;
        },
        end(chunk) {
            this.body = chunk ? String(chunk) : "";
            return this;
        }
    };
}
function createRequest(path, headers) {
    return {
        method: "GET",
        url: path,
        headers: headers ?? { host: "localhost" }
    };
}
describe("createDeckHandler", () => {
    it("returns deck payload with mix counts", async () => {
        const plans = [
            {
                id: "a",
                source: "google",
                sourceId: "g1",
                title: "Coffee",
                category: "coffee",
                location: { lat: 44.97, lng: -93.28 },
                metadata: { sponsored: true }
            },
            {
                id: "b",
                source: "promoted",
                sourceId: "p1",
                title: "Promo",
                category: "food",
                location: { lat: 44.97, lng: -93.28 }
            }
        ];
        const fakeRouter = {
            async search() {
                return {
                    plans,
                    nextCursor: "next-1",
                    sources: ["googlePlaces", "merchant"],
                    debug: { cacheHit: true, calls: [], deduped: { before: 2, after: 2 }, ranked: { count: 2 }, tookMs: 4 }
                };
            }
        };
        const handler = createDeckHandler({ router: fakeRouter });
        const req = createRequest("/sessions/sess-1/deck?lat=44.97&lng=-93.28&categories=coffee,unknown,food", {
            host: "localhost",
            "x-request-id": "req-1",
            "x-user-id": "user-1"
        });
        const res = createMockResponse();
        await handler(req, res, { sessionId: "sess-1" });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body ?? "{}");
        expect(body.sessionId).toBe("sess-1");
        expect(body.nextCursor).toBe("next-1");
        expect(body.plans).toHaveLength(2);
        expect(body.mix.planSourceCounts.google).toBe(1);
        expect(body.mix.planSourceCounts.promoted).toBe(1);
        expect(body.mix.categoryCounts.coffee).toBe(1);
        expect(body.mix.categoryCounts.food).toBe(1);
        expect(body.mix.sponsoredCount).toBe(2);
    });
    it("returns 400 when lat/lng are missing", async () => {
        const fakeRouter = {
            async search() {
                throw new ProviderError({ provider: "test", code: "unexpected", message: "should not execute", retryable: false });
            }
        };
        const handler = createDeckHandler({ router: fakeRouter });
        const req = createRequest("/sessions/sess-1/deck");
        const res = createMockResponse();
        await handler(req, res, { sessionId: "sess-1" });
        expect(res.statusCode).toBe(400);
        const body = JSON.parse(res.body ?? "{}");
        expect(body.error).toBe("validation_error");
        expect(body.details.some((detail) => detail.includes("lat is required"))).toBe(true);
        expect(body.details.some((detail) => detail.includes("lng is required"))).toBe(true);
    });
    it("ignores unknown categories during parsing", async () => {
        let capturedCategories;
        const fakeRouter = {
            async search(input) {
                capturedCategories = input.categories;
                return { plans: [], nextCursor: null, sources: [] };
            }
        };
        const handler = createDeckHandler({ router: fakeRouter });
        const req = createRequest("/sessions/sess-1/deck?lat=44.97&lng=-93.28&categories=coffee,invalid,food");
        const res = createMockResponse();
        await handler(req, res, { sessionId: "sess-1" });
        expect(res.statusCode).toBe(200);
        expect(capturedCategories).toEqual(["coffee", "food"]);
    });
});
