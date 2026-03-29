import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("challenge routes", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("invalid address");
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    });
    it("lists, progresses, and reads challenge details", async () => {
        const headers = { "x-user-id": "challenge-user", "content-type": "application/json" };
        const listRes = await fetch(`${baseUrl}/v1/challenges?cityId=city-minneapolis&cadence=weekly`, { headers: { "x-user-id": "challenge-user" } });
        expect(listRes.status).toBe(200);
        const list = await listRes.json();
        expect(list.challenges.some((item) => item.id === "weekly-coffee-explorer")).toBe(true);
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
        const detailRes = await fetch(`${baseUrl}/v1/challenges/weekly-coffee-explorer`, { headers: { "x-user-id": "challenge-user" } });
        expect(detailRes.status).toBe(200);
        const detail = await detailRes.json();
        expect(detail.progress.criteria[0]?.current).toBe(1);
        const summaryRes = await fetch(`${baseUrl}/v1/challenges/summary`, { headers: { "x-user-id": "challenge-user" } });
        expect(summaryRes.status).toBe(200);
    });
    it("returns quest hub and allows admin live-ops upsert", async () => {
        const hubRes = await fetch(`${baseUrl}/v1/challenges/quest-hub?cityId=city-minneapolis`, { headers: { "x-user-id": "challenge-user" } });
        expect(hubRes.status).toBe(200);
        const hub = await hubRes.json();
        expect(hub.weekly.length).toBeGreaterThan(0);
        expect(hub.seasonal.length).toBeGreaterThan(0);
        const upsertRes = await fetch(`${baseUrl}/v1/admin/challenges`, {
            method: "PUT",
            headers: { "x-admin-user-id": "ops-admin", "content-type": "application/json" },
            body: JSON.stringify({
                id: "weekly-neighborhood-run",
                slug: "weekly-neighborhood-run",
                name: "This Week: Neighborhood Run",
                description: "Open 3 hidden gems in North Loop",
                cadence: "weekly",
                track: "explorer",
                scopeType: "neighborhood",
                scope: { cityIds: ["city-minneapolis"], neighborhoodIds: ["neighborhood-north-loop"], categoryIds: ["hidden_gems"] },
                status: "active",
                startsAt: new Date(Date.now() - 3600_000).toISOString(),
                endsAt: new Date(Date.now() + 3 * 24 * 3600_000).toISOString(),
                timezone: "UTC",
                visibility: "public",
                criteria: [{ id: "open-hidden-gems", eventType: "place_opened", target: 3, distinctPlacesOnly: true }],
                reward: { xp: 180 },
                liveOps: { owner: "ops" },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        });
        expect(upsertRes.status).toBe(200);
    });
});
