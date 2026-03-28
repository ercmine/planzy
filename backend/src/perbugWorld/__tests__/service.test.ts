import { describe, expect, it } from "vitest";

import { MemoryPerbugWorldStore } from "../memoryStore.js";
import { PerbugWorldService } from "../service.js";

const nodes = [
  { id: "a", label: "Downtown", lat: 30.2672, lng: -97.7431, region: "Austin", nodeType: "encounter", difficulty: 2, state: "available", energyReward: 3 },
  { id: "b", label: "South Congress", lat: 30.2493, lng: -97.7495, region: "Austin", nodeType: "resource", difficulty: 3, state: "available", energyReward: 4 },
  { id: "c", label: "Far node", lat: 30.5100, lng: -97.6400, region: "Austin", nodeType: "boss", difficulty: 6, state: "locked", energyReward: 4 }
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

  it("moves player, updates current node, and creates an encounter", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u2", [...nodes]);
    const moved = service.movePlayer("u2", "b", [...nodes]);

    expect(moved.currentNodeId).toBe("b");
    expect(moved.energy).toBeLessThan(14);
    expect(moved.visitedNodeIds).toContain("b");
    expect(moved.activeEncounter?.nodeId).toBe("b");
  });

  it("resolves encounter and applies rewards", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u3", [...nodes]);
    service.movePlayer("u3", "b", [...nodes]);
    const resolved = service.resolveEncounter("u3", true);

    expect(resolved.progression.xp).toBeGreaterThan(0);
    expect(resolved.progression.perbug).toBeGreaterThan(0);
  });

  it("prevents unrestricted teleportation", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u4", [...nodes]);

    expect(() => service.movePlayer("u4", "c", [...nodes])).toThrow();
  });
});
