import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "../index.js";

const serversToClose: Array<ReturnType<typeof createServer>> = [];
afterEach(async () => {
  await Promise.all(serversToClose.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});

async function boot() {
  const server = createServer();
  serversToClose.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected tcp address");
  return `http://127.0.0.1:${address.port}`;
}

describe("dryad marketplace routes", () => {
  it("supports listing browse, claim+plant, and buy from anywhere", async () => {
    const baseUrl = await boot();

    const market = await fetch(`${baseUrl}/v1/dryad/market/listings`);
    expect(market.status).toBe(200);
    const initial = await market.json() as { trees: Array<{ id: string }> };
    expect(initial.trees.length).toBeGreaterThan(0);

    const claim = await fetch(`${baseUrl}/v1/dryad/trees/tree-004/claim-plant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: "0x5555555555555555555555555555555555555555" })
    });
    expect(claim.status).toBe(200);

    const list = await fetch(`${baseUrl}/v1/dryad/market/listings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId: "tree-004", wallet: "0x5555555555555555555555555555555555555555", priceEth: 0.22 })
    });
    expect(list.status).toBe(200);

    const buy = await fetch(`${baseUrl}/v1/dryad/market/buy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId: "tree-004", buyerWallet: "0x6666666666666666666666666666666666666666" })
    });
    expect(buy.status).toBe(200);
    const bought = await buy.json() as { ownerHandle: string; saleStatus: string };
    expect(bought.ownerHandle).toBe("0x6666666666666666666666666666666666666666");
    expect(bought.saleStatus).toBe("not_listed");
  });
});
