import { afterEach, describe, expect, it } from "vitest";

import { MemoryIdeasStore } from "../../plans/bringYourOwn/memoryStorage.js";
import { createServer } from "../index.js";

const serversToClose: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    serversToClose.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
});

describe("ideas routes", () => {
  it("creates ideas and exposes them in deck results with shared store", async () => {
    const ideasStore = new MemoryIdeasStore();
    const server = createServer({ ideasStore });
    serversToClose.push(server);

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected tcp server address");
    }

    const baseUrl = `http://127.0.0.1:${address.port}`;

    const createResponse = await fetch(`${baseUrl}/sessions/abc/ideas`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "user-abc"
      },
      body: JSON.stringify({
        title: "Fresh User Idea",
        description: "A new place to try",
        category: "food"
      })
    });

    expect(createResponse.status).toBe(201);
    const createBody = (await createResponse.json()) as { ideaId: string };
    expect(createBody.ideaId).toBeTruthy();

    const listResponse = await fetch(`${baseUrl}/sessions/abc/ideas?limit=10`);
    expect(listResponse.status).toBe(200);
    const listBody = (await listResponse.json()) as { ideas: Array<{ ideaId: string; title: string }> };
    expect(listBody.ideas.some((idea) => idea.ideaId === createBody.ideaId)).toBe(true);

    const deckResponse = await fetch(`${baseUrl}/sessions/abc/deck?lat=44.97&lng=-93.28&limit=10`);
    expect(deckResponse.status).toBe(200);
    const deckBody = (await deckResponse.json()) as { plans: Array<{ source: string; title: string; metadata?: { ideaId?: string } }> };

    const userPlanIndex = deckBody.plans.findIndex((plan) => plan.metadata?.ideaId === createBody.ideaId);
    expect(userPlanIndex).toBeGreaterThanOrEqual(0);
    expect(userPlanIndex).toBeLessThan(3);
    expect(deckBody.plans[userPlanIndex]?.source).toBe("byo");

    const deleteResponse = await fetch(`${baseUrl}/sessions/abc/ideas/${createBody.ideaId}`, {
      method: "DELETE",
      headers: {
        "x-user-id": "user-abc"
      }
    });

    expect(deleteResponse.status).toBe(204);

    const deckAfterDeleteResponse = await fetch(`${baseUrl}/sessions/abc/deck?lat=44.97&lng=-93.28&limit=10`);
    expect(deckAfterDeleteResponse.status).toBe(200);
    const deckAfterDeleteBody = (await deckAfterDeleteResponse.json()) as {
      plans: Array<{ metadata?: { ideaId?: string } }>;
    };

    expect(deckAfterDeleteBody.plans.some((plan) => plan.metadata?.ideaId === createBody.ideaId)).toBe(false);
  });
});
