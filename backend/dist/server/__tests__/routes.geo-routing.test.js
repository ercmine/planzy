import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MemoryMerchantStore } from "../../merchant/memoryStore.js";
import { MerchantService } from "../../merchant/service.js";
import { createHttpServer } from "../httpServer.js";
import { VenueClaimsService } from "../../venues/claims/claimsService.js";
import { MemoryVenueClaimStore } from "../../venues/claims/memoryStore.js";
function createGeoGatewayStub() {
    return {
        async geocode() {
            return [
                {
                    displayName: "Berlin, Germany",
                    lat: 52.5173885,
                    lng: 13.3951309,
                    city: "Berlin",
                    state: "Berlin",
                    country: "Germany",
                    class: "place",
                    type: "city",
                    confidence: 0.98,
                    source: "nominatim"
                }
            ];
        },
        async reverseGeocode() {
            return {
                displayName: "Mitte, Berlin, Germany",
                lat: 52.5173885,
                lng: 13.3951309,
                city: "Berlin",
                state: "Berlin",
                country: "Germany",
                class: "place",
                type: "city",
                confidence: 0.92,
                source: "nominatim"
            };
        },
        async autocomplete() {
            return [
                {
                    id: "berlin-1",
                    displayName: "Berlin, Germany",
                    lat: 52.5173885,
                    lng: 13.3951309,
                    city: "Berlin",
                    region: "Berlin",
                    country: "Germany",
                    countryCode: "de",
                    category: "place",
                    type: "city",
                    relevanceScore: 0.97,
                    source: "nominatim"
                }
            ];
        },
        async placeLookup() {
            return [];
        },
        async areaContext() {
            return { lat: 52.5173885, lng: 13.3951309, source: "nominatim" };
        },
        async health() {
            return { ok: true, mode: "remote", version: "1.0.0" };
        }
    };
}
describe("geo route alias routing", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        const claimsService = new VenueClaimsService(new MemoryVenueClaimStore());
        const merchantService = new MerchantService(new MemoryMerchantStore());
        server = createHttpServer(claimsService, merchantService, {
            geoGateway: createGeoGatewayStub(),
            geoStatus: {
                gateway: null,
                mode: "remote",
                routesMounted: true,
                upstreamBaseUrl: "https://geo.example.test",
                validationErrors: [],
                validationWarnings: []
            }
        });
        await new Promise((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve());
        });
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("Server failed to bind for geo routing tests");
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
    it("resolves /api/geo/search", async () => {
        const response = await fetch(`${baseUrl}/api/geo/search?q=Berlin`);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            results: expect.arrayContaining([expect.objectContaining({ displayName: "Berlin, Germany" })])
        });
    });
    it("resolves /api/geo/reverse", async () => {
        const response = await fetch(`${baseUrl}/api/geo/reverse?lat=52.5173885&lon=13.3951309`);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            result: expect.objectContaining({ displayName: "Mitte, Berlin, Germany" })
        });
    });
    it("resolves /api/geo/autocomplete", async () => {
        const response = await fetch(`${baseUrl}/api/geo/autocomplete?q=Ber`);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            suggestions: expect.arrayContaining([expect.objectContaining({ displayName: "Berlin, Germany" })])
        });
    });
    it("resolves /api/geo/nearby", async () => {
        const response = await fetch(`${baseUrl}/api/geo/nearby?lat=52.5173885&lon=13.3951309&radius=3000`);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            origin: { lat: 52.5173885, lng: 13.3951309 },
            places: expect.any(Array)
        });
    });
    it("resolves /api/geo/health", async () => {
        const response = await fetch(`${baseUrl}/api/geo/health`);
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({
            ok: true,
            status: expect.objectContaining({ routesMounted: true })
        });
    });
    it("keeps normalization and geo matching consistent across aliases", async () => {
        const variants = ["/api/geo/search?q=Berlin", "/geo/search?q=Berlin"];
        for (const path of variants) {
            const response = await fetch(`${baseUrl}${path}`);
            expect(response.status).toBe(200);
            await expect(response.json()).resolves.toMatchObject({
                results: expect.arrayContaining([expect.objectContaining({ displayName: "Berlin, Germany" })])
            });
        }
    });
});
