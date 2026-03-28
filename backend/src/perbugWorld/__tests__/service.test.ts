import { describe, expect, it } from "vitest";

import { MemoryPerbugWorldStore } from "../memoryStore.js";
import { PerbugWorldService } from "../service.js";

const nodes = [
  { id: "a", label: "Downtown", lat: 30.2672, lng: -97.7431, region: "Austin", biome: "urban", rarity: "common", nodeType: "encounter", difficulty: 2, state: "available", energyReward: 3 },
  { id: "b", label: "South Congress", lat: 30.2493, lng: -97.7495, region: "Austin", biome: "garden", rarity: "uncommon", nodeType: "resource", difficulty: 3, state: "available", energyReward: 4 },
  { id: "c", label: "Far node", lat: 30.5100, lng: -97.6400, region: "Austin", biome: "wastes", rarity: "epic", nodeType: "boss", difficulty: 6, state: "locked", energyReward: 4 }
] as const;

describe("PerbugWorldService encounter framework", () => {
  it("initializes current node and computes reachable nodes", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    const state = service.initializePlayer("u1", [...nodes]);
    const reachable = service.computeReachableNodes(state, [...nodes]);

    expect(state.currentNodeId).toBe("a");
    expect(reachable.some((row) => row.node.id === "b" && row.reachable)).toBe(true);
    expect(reachable.some((row) => row.node.id === "c" && !row.reachable)).toBe(true);
  });

  it("builds encounter preview from node data and resolver", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u2", [...nodes]);
    const moved = service.movePlayer("u2", "b", [...nodes]);

    const preview = service.previewEncounter("u2", moved.currentNodeId, [...nodes]);

    expect(preview.type).toBe("treasure");
    expect(preview.eligibility.eligible).toBe(true);
    expect(preview.preview.title.length).toBeGreaterThan(0);
  });

  it("runs launch -> action -> finalize and applies progression rewards once", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u3", [...nodes]);
    service.movePlayer("u3", "b", [...nodes]);

    const launched = service.launchEncounter("u3", "b", [...nodes]);
    expect(launched.activeEncounter?.state).toBe("active");

    const acted = service.submitEncounterAction("u3", { actionId: "solve", summary: "player solved puzzle" });
    expect(acted.activeEncounter?.state).toBe("completed");

    const finalized = service.finalizeEncounter("u3");
    expect(finalized.activeEncounter).toBeUndefined();
    expect(finalized.progression.xp).toBeGreaterThan(0);
    expect(finalized.progression.perbug).toBeGreaterThan(0);

    expect(() => service.finalizeEncounter("u3")).toThrow();
  });

  it("supports fail -> retry -> complete for encounter lifecycle", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u4", [...nodes]);
    service.movePlayer("u4", "b", [...nodes]);
    service.launchEncounter("u4", "b", [...nodes]);

    const failedAction = service.submitEncounterAction("u4", { actionId: "fail", summary: "player failed" });
    expect(failedAction.activeEncounter?.state).toBe("failed");

    const retried = service.retryEncounter("u4");
    expect(retried.activeEncounter?.state).toBe("active");
    expect(retried.activeEncounter?.retryCount).toBeGreaterThanOrEqual(1);

    service.submitEncounterAction("u4", { actionId: "solve", summary: "second try success" });
    const finalized = service.finalizeEncounter("u4");
    expect(finalized.progression.completedNodeIds).toContain("b");
  });

  it("supports abandon flow without corrupting state", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u5", [...nodes]);
    service.movePlayer("u5", "b", [...nodes]);
    service.launchEncounter("u5", "b", [...nodes]);

    const abandoned = service.abandonEncounter("u5");
    expect(abandoned.activeEncounter?.state).toBe("abandoned");

    const finalized = service.finalizeEncounter("u5");
    expect(finalized.progression.xp).toBe(0);
    expect(finalized.nodeProgress.b.completionState).toBe("failed");
  });

  it("keeps analytics trail for encounter generation and resolution", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u6", [...nodes]);
    service.movePlayer("u6", "b", [...nodes]);
    service.previewEncounter("u6", "b", [...nodes]);
    service.launchEncounter("u6", "b", [...nodes]);
    service.submitEncounterAction("u6", { actionId: "solve", summary: "done" });
    const done = service.finalizeEncounter("u6");

    expect(done.analyticsLog.length).toBeGreaterThanOrEqual(4);
    expect(done.analyticsLog.some((event) => event.eventType === "generated")).toBe(true);
    expect(done.analyticsLog.some((event) => event.eventType === "rewarded")).toBe(true);
  });

  it("prevents unrestricted teleportation", () => {
    const service = new PerbugWorldService(new MemoryPerbugWorldStore());
    service.initializePlayer("u7", [...nodes]);

    expect(() => service.movePlayer("u7", "c", [...nodes])).toThrow();
  });
});
