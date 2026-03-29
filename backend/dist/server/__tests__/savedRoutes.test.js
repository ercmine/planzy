import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
describe("saved places and list routes", () => {
    let server;
    let baseUrl;
    beforeAll(async () => {
        server = createServer();
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string")
            throw new Error("bad bind");
        baseUrl = `http://127.0.0.1:${address.port}`;
    });
    afterAll(async () => {
        await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    });
    it("saves and unsaves places idempotently", async () => {
        const headers = { "x-user-id": "save-user", "content-type": "application/json" };
        const first = await fetch(`${baseUrl}/v1/saved/places`, { method: "POST", headers, body: JSON.stringify({ placeId: "google:abc" }) });
        expect(first.status).toBe(200);
        const second = await fetch(`${baseUrl}/v1/saved/places`, { method: "POST", headers, body: JSON.stringify({ placeId: "google:abc" }) });
        expect(second.status).toBe(200);
        const listResponse = await fetch(`${baseUrl}/v1/saved`, { headers: { "x-user-id": "save-user" } });
        expect(listResponse.status).toBe(200);
        await expect(listResponse.json()).resolves.toMatchObject({
            savedPlaces: [expect.objectContaining({ placeId: "google:abc" })],
            lists: [expect.objectContaining({ isDefault: true })]
        });
        const del = await fetch(`${baseUrl}/v1/saved/places/google%3Aabc`, { method: "DELETE", headers: { "x-user-id": "save-user" } });
        expect(del.status).toBe(200);
        const after = await fetch(`${baseUrl}/v1/saved`, { headers: { "x-user-id": "save-user" } });
        await expect(after.json()).resolves.toMatchObject({ savedPlaces: [] });
    });
    it("enforces private/public list visibility and owner-only mutations", async () => {
        const ownerHeaders = { "x-user-id": "list-owner", "content-type": "application/json" };
        await fetch(`${baseUrl}/v1/subscription/change`, {
            method: "POST",
            headers: ownerHeaders,
            body: JSON.stringify({ targetPlanId: "user-plus" })
        });
        const create = await fetch(`${baseUrl}/v1/saved/lists`, {
            method: "POST",
            headers: ownerHeaders,
            body: JSON.stringify({ title: "Weekend", visibility: "public" })
        });
        const created = await create.json();
        expect(create.status).toBe(201);
        const listId = created.list?.id;
        expect(listId).toBeTruthy();
        const outsiderUpdate = await fetch(`${baseUrl}/v1/saved/lists/${listId ?? "missing"}`, {
            method: "PATCH",
            headers: { "x-user-id": "outsider", "content-type": "application/json" },
            body: JSON.stringify({ title: "Nope" })
        });
        expect(outsiderUpdate.status).toBe(404);
        const privateUpdate = await fetch(`${baseUrl}/v1/saved/lists/${listId ?? "missing"}`, {
            method: "PATCH",
            headers: ownerHeaders,
            body: JSON.stringify({ visibility: "private" })
        });
        expect(privateUpdate.status).toBe(200);
        const hidden = await fetch(`${baseUrl}/v1/saved/lists/${listId ?? "missing"}`, { headers: { "x-user-id": "outsider" } });
        expect(hidden.status).toBe(404);
        const ownerVisible = await fetch(`${baseUrl}/v1/saved/lists/${listId ?? "missing"}`, { headers: { "x-user-id": "list-owner" } });
        expect(ownerVisible.status).toBe(200);
        const publicListIndex = await fetch(`${baseUrl}/v1/profiles/list-owner/lists`);
        await expect(publicListIndex.json()).resolves.toMatchObject({ lists: [] });
    });
});
