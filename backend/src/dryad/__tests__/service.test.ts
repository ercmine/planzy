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
});
