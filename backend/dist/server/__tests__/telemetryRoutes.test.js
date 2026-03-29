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
describe("telemetry routes", () => {
    it("ingests telemetry batches and returns aggregate for admin", async () => {
        const server = createServer();
        serversToClose.push(server);
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("expected TCP address");
        }
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const ingestResp = await fetch(`${baseUrl}/sessions/session-1/telemetry`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-user-id": "user-1",
                "x-request-id": "req-1"
            },
            body: JSON.stringify({
                events: [
                    { event: "deck_loaded", sessionId: "session-1", batchSize: 5, returned: 5, nextCursorPresent: false },
                    { event: "swipe", sessionId: "session-1", planId: "plan-1", action: "yes" }
                ]
            })
        });
        expect(ingestResp.status).toBe(202);
        const ingestBody = (await ingestResp.json());
        expect(ingestBody.accepted).toBe(2);
        expect(ingestBody.rejected).toBe(0);
        const aggregateResp = await fetch(`${baseUrl}/sessions/session-1/telemetry/aggregate`, {
            headers: { "x-admin-key": "test-admin-key" }
        });
        expect(aggregateResp.status).toBe(200);
        const aggregateBody = (await aggregateResp.json());
        expect(aggregateBody.countsByEvent.deck_loaded).toBe(1);
        expect(aggregateBody.countsByEvent.swipe).toBe(1);
        expect(aggregateBody.swipes).toEqual({ yes: 1, no: 0, maybe: 0 });
    });
});
