import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("social gamification routes", () => {
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
    it("returns social feed and supports privacy update + action recording", async () => {
        const feedRes = await fetch(`${baseUrl}/v1/social-gamification/feed?cityId=city-minneapolis`, { headers: { "x-user-id": "u1" } });
        expect(feedRes.status).toBe(200);
        const privacyRes = await fetch(`${baseUrl}/v1/social-gamification/privacy`, {
            method: "PUT",
            headers: { "x-user-id": "u1", "content-type": "application/json" },
            body: JSON.stringify({ allowCompetition: false, defaultShareVisibility: "private" })
        });
        expect(privacyRes.status).toBe(200);
        const actionRes = await fetch(`${baseUrl}/v1/social-gamification/actions`, {
            method: "POST",
            headers: { "x-user-id": "u1", "content-type": "application/json" },
            body: JSON.stringify({ eventId: "route-1", type: "review_created", canonicalPlaceId: "p-400", cityId: "city-minneapolis", contentState: "published", trustScore: 66 })
        });
        expect(actionRes.status).toBe(200);
        const feed = await (await fetch(`${baseUrl}/v1/social-gamification/feed?cityId=city-minneapolis`, { headers: { "x-user-id": "u1" } })).json();
        expect(feed.competition).toBeUndefined();
    });
    it("supports admin goal upsert", async () => {
        const response = await fetch(`${baseUrl}/v1/admin/social-gamification/goals`, {
            method: "PUT",
            headers: { "x-admin-user-id": "ops", "content-type": "application/json" },
            body: JSON.stringify({
                id: "city-parks-spring",
                title: "City Parks Sprint",
                scope: { cityId: "city-minneapolis", categoryId: "parks" },
                visibility: "public",
                startsAt: new Date(Date.now() - 3600_000).toISOString(),
                endsAt: new Date(Date.now() + 10 * 24 * 3600_000).toISOString(),
                targetPoints: 300,
                rules: [{ eventType: "place_saved", points: 1, distinctPlacesOnly: true, minTrustScore: 40, requireCanonicalPlaceId: true }],
                rewardBadgeId: "parks-contributor"
            })
        });
        expect(response.status).toBe(200);
    });
});
