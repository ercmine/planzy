import { describe, expect, it } from "vitest";

import { MemoryPerbugWorldStore } from "../memoryStore.js";
import { PerbugWorldService } from "../service.js";

const nodes = [
  { id: "a", label: "Downtown", lat: 30.2672, lng: -97.7431, region: "Austin", state: "available", energyReward: 3 },
  { id: "b", label: "South Congress", lat: 30.2493, lng: -97.7495, region: "Austin", state: "available", energyReward: 4 },
  { id: "c", label: "Far node", lat: 30.5100, lng: -97.6400, region: "Austin", state: "locked", energyReward: 4 }
] as const;

describe("PerbugWorldService", () => {
  it("initializes current node and computes reachable nodes", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    const state = service.initializePlayer("u1", [...nodes]);
    const reachable = service.computeReachableNodes(state, [...nodes]);

    expect(state.currentNodeId).toBe("a");
    expect(reachable.some((row) => row.node.id === "b" && row.reachable)).toBe(true);
    expect(reachable.some((row) => row.node.id === "c" && !row.reachable)).toBe(true);
  });

  it("moves player, updates current node, and spends energy", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u2", [...nodes]);
    const moved = service.movePlayer("u2", "b", [...nodes]);

    expect(moved.currentNodeId).toBe("b");
    expect(moved.energy).toBeLessThan(14);
    expect(moved.visitedNodeIds).toContain("b");
  });

  it("prevents unrestricted teleportation", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u3", [...nodes]);

    expect(() => service.movePlayer("u3", "c", [...nodes])).toThrow();
  });
});
