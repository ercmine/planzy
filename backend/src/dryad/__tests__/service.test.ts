import { describe, expect, it } from "vitest";
import { DryadMarketplaceService } from "../service.js";
import type { DryadTree, SpotRef, WalletAddress } from "../domain.js";

describe("DryadMarketplaceService", () => {
  it("treats trees without an assigned place as dug up and replantable", () => {
    const owner = "0x1111111111111111111111111111111111111111" as WalletAddress;
    const unassignedTree: DryadTree = {
      treeId: "tree-unassigned",
      nftTokenId: "42",
      place: { placeId: "", label: "Unknown", lat: 0, lng: 0 },
      founder: owner,
      owner,
      growthLevel: 1,
      contributionCount: 0,
    };
    const spot: SpotRef = {
      spotId: "spot-1",
      placeId: "place-1",
      label: "Oracle Meadow",
      lat: 37.7682,
      lng: -122.401,
      claimState: "unclaimed",
    };

    const service = new DryadMarketplaceService([unassignedTree], [], [spot]);
    const tree = service.getTree("tree-unassigned");

    expect(tree?.lifecycleState).toBe("ready_to_replant");
    expect(tree?.portable).toBe(true);
    expect(tree?.currentSpotId).toBeUndefined();
    expect(service.listReplantableTrees(owner)).toHaveLength(1);

    const replantIntent = service.createReplantIntent("tree-unassigned", owner, "spot-1");
    expect(replantIntent.status).toBe("created");
  });

  it("builds cohesive flywheel signals for tend, market, map, progression, and loop metrics", () => {
    const owner = "0x2222222222222222222222222222222222222222" as WalletAddress;
    const buyer = "0x5555555555555555555555555555555555555555" as WalletAddress;
    const founder = "0x1111111111111111111111111111111111111111" as WalletAddress;
    const treeA: DryadTree = {
      treeId: "tree-a",
      nftTokenId: "1",
      place: { placeId: "spot-a", label: "SF Grove", lat: 37.77, lng: -122.41 },
      founder,
      owner,
      growthLevel: 4,
      contributionCount: 3,
    };
    const treeB: DryadTree = {
      treeId: "tree-b",
      nftTokenId: "2",
      place: { placeId: "spot-b", label: "Austin Grove", lat: 30.26, lng: -97.74 },
      founder,
      owner: "0x0000000000000000000000000000000000000000",
      growthLevel: 0,
      contributionCount: 0,
    };
    const service = new DryadMarketplaceService([treeA, treeB], [], [
      { spotId: "spot-a", placeId: "spot-a", label: "SF Grove", lat: 37.77, lng: -122.41, claimState: "claimed" },
      { spotId: "spot-b", placeId: "spot-b", label: "Austin Grove", lat: 30.26, lng: -97.74, claimState: "unclaimed" },
    ]);

    service.waterTree("tree-a", owner);
    service.listTree("tree-a", owner, "0.3");
    service.buyTree("tree-a", buyer);
    service.claimAndPlant("tree-b", owner, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    service.watchTree(owner, "tree-a");

    const tend = service.tendQueue(owner);
    expect(tend.length).toBeGreaterThan(0);

    const market = service.marketPulse();
    expect(market.listedCount).toBe(0);
    expect(market.soldCount24h).toBe(1);

    const map = service.mapPulse();
    expect(map.plantedTreeCount).toBeGreaterThanOrEqual(1);

    const progression = service.progression(owner);
    expect(progression.ownedTreeCount).toBe(1);

    const triggers = service.returnTriggers(owner);
    expect(triggers.some((trigger) => trigger.treeId === "tree-b")).toBe(true);

    const metrics = service.loopMetrics();
    expect(metrics.firstPlantCompletedWallets).toBe(1);
    expect(metrics.firstWaterActionWallets).toBe(1);
    expect(metrics.firstMarketplaceBuyWallets).toBe(1);

    const world = service.worldSnapshot();
    expect(world.trendingTreeIds.length).toBeGreaterThan(0);
    expect(world.creatorProfiles.length).toBeGreaterThan(0);
  });
});
