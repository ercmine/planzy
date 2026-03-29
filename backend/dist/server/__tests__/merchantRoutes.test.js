import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
const serversToClose = [];
beforeEach(() => {
    process.env.ADMIN_API_KEY = "test-admin-key";
});
afterEach(async () => {
    await Promise.all(serversToClose.splice(0).map((server) => new Promise((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    })));
    delete process.env.ADMIN_API_KEY;
});
describe("merchant admin routes", () => {
    it("enforces admin key and CRUDs promoted and specials", async () => {
        const server = createServer();
        serversToClose.push(server);
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("expected TCP address");
        }
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const unauthorized = await fetch(`${baseUrl}/v1/admin/promoted`);
        expect(unauthorized.status).toBe(401);
        const adminHeaders = { "content-type": "application/json", "x-admin-key": "test-admin-key" };
        const createPromoted = await fetch(`${baseUrl}/v1/admin/promoted`, {
            method: "POST",
            headers: adminHeaders,
            body: JSON.stringify({ venueId: "google:g1", title: "Promoted" })
        });
        expect(createPromoted.status).toBe(201);
        const createdPromotedBody = (await createPromoted.json());
        const listPromoted = await fetch(`${baseUrl}/v1/admin/promoted`, { headers: { "x-admin-key": "test-admin-key" } });
        expect(listPromoted.status).toBe(200);
        const promotedListBody = (await listPromoted.json());
        expect(promotedListBody.items).toHaveLength(1);
        const patchPromoted = await fetch(`${baseUrl}/v1/admin/promoted/${createdPromotedBody.promoId}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ status: "paused" })
        });
        expect(patchPromoted.status).toBe(200);
        const patchedPromotedBody = (await patchPromoted.json());
        expect(patchedPromotedBody.status).toBe("paused");
        const deletePromoted = await fetch(`${baseUrl}/v1/admin/promoted/${createdPromotedBody.promoId}`, {
            method: "DELETE",
            headers: { "x-admin-key": "test-admin-key" }
        });
        expect(deletePromoted.status).toBe(200);
        const createSpecial = await fetch(`${baseUrl}/v1/admin/specials`, {
            method: "POST",
            headers: adminHeaders,
            body: JSON.stringify({ venueId: "google:g1", headline: "Special" })
        });
        expect(createSpecial.status).toBe(201);
        const createdSpecialBody = (await createSpecial.json());
        const listSpecials = await fetch(`${baseUrl}/v1/admin/specials`, { headers: { "x-admin-key": "test-admin-key" } });
        expect(listSpecials.status).toBe(200);
        const specialsListBody = (await listSpecials.json());
        expect(specialsListBody.items).toHaveLength(1);
        const patchSpecial = await fetch(`${baseUrl}/v1/admin/specials/${createdSpecialBody.specialId}`, {
            method: "PATCH",
            headers: adminHeaders,
            body: JSON.stringify({ status: "paused" })
        });
        expect(patchSpecial.status).toBe(200);
        const patchedSpecialBody = (await patchSpecial.json());
        expect(patchedSpecialBody.status).toBe("paused");
        const deleteSpecial = await fetch(`${baseUrl}/v1/admin/specials/${createdSpecialBody.specialId}`, {
            method: "DELETE",
            headers: { "x-admin-key": "test-admin-key" }
        });
        expect(deleteSpecial.status).toBe(200);
    });
});
