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

describe("perbug marketplace routes", () => {
  it("supports listing browse, claim+plant, and buy from anywhere", async () => {
    const baseUrl = await boot();

    const market = await fetch(`${baseUrl}/v1/perbug/market/listings`);
    expect(market.status).toBe(200);
    const initial = await market.json() as { trees: Array<{ id: string }> };
    expect(initial.trees.length).toBeGreaterThan(0);

    const claim = await fetch(`${baseUrl}/v1/perbug/trees/tree-004/claim-plant`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wallet: "0x5555555555555555555555555555555555555555",
        seed: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      })
    });
    expect(claim.status).toBe(200);

    const list = await fetch(`${baseUrl}/v1/perbug/market/listings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId: "tree-004", wallet: "0x5555555555555555555555555555555555555555", priceEth: 0.22 })
    });
    expect(list.status).toBe(200);

    const buy = await fetch(`${baseUrl}/v1/perbug/market/buy`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId: "tree-004", buyerWallet: "0x6666666666666666666666666666666666666666" })
    });
    expect(buy.status).toBe(200);
    const bought = await buy.json() as { ownerHandle: string; saleStatus: string; lifecycleState: string };
    expect(bought.ownerHandle).toBe("0x6666666666666666666666666666666666666666");
    expect(bought.saleStatus).toBe("not_listed");
    expect(bought.lifecycleState).toBe("sold");
  });

  it("enforces dig-up payment and allows replanting on an unclaimed spot", async () => {
    const baseUrl = await boot();
    const owner = "0x1111111111111111111111111111111111111111";

    const eligibility = await fetch(`${baseUrl}/v1/perbug/trees/tree-002/dig-up-eligibility?wallet=${owner}`);
    expect(eligibility.status).toBe(200);
    const eligibilityJson = await eligibility.json() as { eligible: boolean; feeWei: string; recipient: string };
    expect(eligibilityJson.eligible).toBe(true);
    expect(eligibilityJson.feeWei).toBe("100000000000000000");

    const createIntent = await fetch(`${baseUrl}/v1/perbug/trees/tree-002/dig-up-intents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: owner, chainId: 1 })
    });
    expect(createIntent.status).toBe(201);
    const intent = await createIntent.json() as { intentId: string; feeRecipient: string };

    const confirmIntent = await fetch(`${baseUrl}/v1/perbug/dig-up-intents/${intent.intentId}/confirm`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentTxHash: "0xabc0000000000000000000000000000000000000000000000000000000000001",
        from: owner,
        to: intent.feeRecipient,
        valueWei: "100000000000000000",
        chainId: 1
      })
    });
    expect(confirmIntent.status).toBe(200);

    const treeAfterDigUp = await fetch(`${baseUrl}/v1/perbug/trees/tree-002`);
    const treeAfterDigUpJson = await treeAfterDigUp.json() as { lifecycleState: string; isPortable: boolean; currentSpotId: string | null };
    expect(treeAfterDigUpJson.lifecycleState).toBe("ready_to_replant");
    expect(treeAfterDigUpJson.isPortable).toBe(true);
    expect(treeAfterDigUpJson.currentSpotId).toBeNull();

    const spots = await fetch(`${baseUrl}/v1/perbug/spots/unclaimed`);
    const spotsJson = await spots.json() as { spots: Array<{ spotId: string; claimState: string }> };
    const targetSpot = spotsJson.spots.find((spot) => spot.claimState === "unclaimed");
    expect(targetSpot).toBeTruthy();

    const createReplantIntent = await fetch(`${baseUrl}/v1/perbug/replant-intents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ treeId: "tree-002", wallet: owner, nextSpotId: targetSpot?.spotId })
    });
    expect(createReplantIntent.status).toBe(201);
    const replantIntent = await createReplantIntent.json() as { intentId: string };

    const confirmReplant = await fetch(`${baseUrl}/v1/perbug/replant-intents/${replantIntent.intentId}/confirm`, { method: "POST" });
    expect(confirmReplant.status).toBe(200);

    const replantable = await fetch(`${baseUrl}/v1/perbug/trees/replantable?wallet=${owner}`);
    const replantableJson = await replantable.json() as { trees: Array<unknown> };
    expect(replantableJson.trees).toHaveLength(0);
  });

  it("supports owned trees query and remote watering cooldown", async () => {
    const baseUrl = await boot();
    const owner = "0x1111111111111111111111111111111111111111";

    const owned = await fetch(`${baseUrl}/v1/perbug/trees/owned?wallet=${owner}`);
    expect(owned.status).toBe(200);
    const ownedJson = await owned.json() as { trees: Array<{ ownerHandle: string; id: string }> };
    expect(ownedJson.trees.length).toBeGreaterThan(0);
    expect(ownedJson.trees.every((tree) => tree.ownerHandle.toLowerCase() === owner.toLowerCase())).toBe(true);

    const treeId = ownedJson.trees[0]?.id;
    expect(treeId).toBeTruthy();

    const waterEligibility = await fetch(`${baseUrl}/v1/perbug/trees/${treeId}/water-eligibility?wallet=${owner}`);
    expect(waterEligibility.status).toBe(200);
    const waterEligibilityJson = await waterEligibility.json() as { eligible: boolean };
    expect(waterEligibilityJson.eligible).toBe(true);

    const water = await fetch(`${baseUrl}/v1/perbug/trees/${treeId}/water`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: owner }),
    });
    expect(water.status).toBe(200);
    const wateredTree = await water.json() as { lastWateredAt: string | null; nextWateringAvailableAt: string | null };
    expect(wateredTree.lastWateredAt).toBeTruthy();
    expect(wateredTree.nextWateringAvailableAt).toBeTruthy();

    const cooldownEligibility = await fetch(`${baseUrl}/v1/perbug/trees/${treeId}/water-eligibility?wallet=${owner}`);
    expect(cooldownEligibility.status).toBe(200);
    const cooldownEligibilityJson = await cooldownEligibility.json() as { eligible: boolean; reason?: string };
    expect(cooldownEligibilityJson.eligible).toBe(false);
    expect(cooldownEligibilityJson.reason).toBe("watering_cooldown_active");
  });
});
