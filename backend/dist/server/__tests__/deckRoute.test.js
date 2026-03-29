import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";
const serversToClose = [];
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
});
describe("deck route", () => {
    it("returns session deck batch and cursor", async () => {
        const routerStub = {
            async search(input) {
                return {
                    plans: [
                        {
                            id: "google:g1",
                            source: "google",
                            sourceId: "g1",
                            title: "Test plan",
                            category: "food",
                            location: { lat: input.location.lat, lng: input.location.lng }
                        }
                    ],
                    nextCursor: input.cursor ? `${input.cursor}-next` : "cursor-1",
                    sources: ["places"]
                };
            }
        };
        const server = createServer({ deckRouter: routerStub });
        serversToClose.push(server);
        await new Promise((resolve) => {
            server.listen(0, "127.0.0.1", () => resolve());
        });
        const address = server.address();
        if (!address || typeof address === "string") {
            throw new Error("expected tcp server address");
        }
        const baseUrl = `http://127.0.0.1:${address.port}`;
        const response = await fetch(`${baseUrl}/sessions/abc/deck?lat=44.97&lng=-93.28&cursor=start-cursor`);
        expect(response.status).toBe(200);
        const body = (await response.json());
        expect(body.sessionId).toBe("abc");
        expect(body.nextCursor).toBe("start-cursor-next");
    });
});
