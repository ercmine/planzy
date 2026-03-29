import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
const serversToClose = [];
afterEach(async () => {
    await Promise.all(serversToClose.splice(0).map((server) => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    })));
});
describe("rollout routes", () => {
    it("returns rollout summary and blocks gated outing planner endpoints", async () => {
        const server = createServer();
        serversToClose.push(server);
        await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const addr = server.address();
        if (!addr || typeof addr === "string")
            throw new Error("invalid server addr");
        const base = `http://127.0.0.1:${addr.port}`;
        const summary = await fetch(`${base}/v1/rollouts/summary`, { headers: { "x-user-id": "user-1" } });
        expect(summary.status).toBe(200);
        const summaryBody = await summary.json();
        expect(summaryBody.features["ai.itinerary"]?.enabled).toBe(false);
        const blocked = await fetch(`${base}/v1/outing-planner/create`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-user-id": "user-1" },
            body: JSON.stringify({ destinationCity: "Chicago", vibe: "food", budget: "medium" })
        });
        expect(blocked.status).toBe(423);
        const blockedBody = await blocked.json();
        expect(blockedBody.error).toBe("FEATURE_NOT_ROLLED_OUT");
        expect(blockedBody.featureKey).toBe("ai.itinerary");
    });
});
