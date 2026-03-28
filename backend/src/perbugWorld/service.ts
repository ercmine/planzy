import { ValidationError } from "../plans/errors.js";
import type { NodeEncounter, PerbugNode, PerbugNodeType, PerbugWorldStore, PlayerWorldState, ReachableNode, RewardBundle } from "./types.js";

const nowIso = () => new Date().toISOString();

export class PerbugWorldService {
  constructor(private readonly store: PerbugWorldStore) {}

  initializePlayer(userId: string, nodePool: PerbugNode[]): PlayerWorldState {
    if (!userId.trim()) throw new ValidationError(["userId is required"]);
    if (nodePool.length === 0) throw new ValidationError(["nodePool must include at least one real geodata node"]);
    const existing = this.store.getPlayerState(userId);
    if (existing) return existing;
    const startNode = nodePool[0];
    const state: PlayerWorldState = {
      userId,
      currentNodeId: startNode.id,
      energy: 14,
      maxEnergy: 30,
      movementRangeMeters: 2400,
      visitedNodeIds: [startNode.id],
      movementHistory: [],
      progression: {
        level: 1,
        xp: 0,
        perbug: 0,
        inventory: { bio_dust: 0, signal_shard: 0 }
      },
      squad: {
        maxSlots: 3,
        units: [
          { id: "u-scout", name: "Scout Midge", power: 8, rarity: "common", equipped: true },
          { id: "u-tech", name: "Relay Beetle", power: 6, rarity: "common", equipped: true }
        ]
      }
    };
    this.store.savePlayerState(state);
    return state;
  }

  computeReachableNodes(state: PlayerWorldState, nodePool: PerbugNode[]): ReachableNode[] {
    const current = nodePool.find((node) => node.id === state.currentNodeId);
    if (!current) throw new ValidationError(["current node missing from node pool"]);

    return nodePool
      .filter((node) => node.id !== current.id)
      .map((node) => {
        const distance = haversineMeters(current.lat, current.lng, node.lat, node.lng);
        const energyCost = Math.max(2, Math.round(distance / 450));
        return {
          node,
          distanceMeters: distance,
          energyCost,
          reachable: distance <= state.movementRangeMeters && state.energy >= energyCost
        };
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
  }

  movePlayer(userId: string, destinationNodeId: string, nodePool: PerbugNode[]) {
    const state = this.getPlayerState(userId);
    const reachable = this.computeReachableNodes(state, nodePool);
    const choice = reachable.find((item) => item.node.id === destinationNodeId);
    if (!choice) throw new ValidationError(["destination node is unknown"]);
    if (!choice.reachable) throw new ValidationError(["destination node is not reachable by range/energy"]);

    const isFirstVisit = !state.visitedNodeIds.includes(choice.node.id);
    const reward = isFirstVisit ? choice.node.energyReward : 1;
    const nextEnergy = Math.min(state.maxEnergy, Math.max(0, state.energy - choice.energyCost + reward));

    const next: PlayerWorldState = {
      ...state,
      currentNodeId: choice.node.id,
      energy: nextEnergy,
      visitedNodeIds: isFirstVisit ? [...state.visitedNodeIds, choice.node.id] : state.visitedNodeIds,
      movementHistory: [
        ...state.movementHistory,
        { fromNodeId: state.currentNodeId, toNodeId: choice.node.id, energyCost: choice.energyCost, happenedAt: nowIso() }
      ],
      activeEncounter: this.createEncounter(choice.node)
    };

    this.store.savePlayerState(next);
    return next;
  }

  claimEnergy(userId: string, amount = 3) {
    const state = this.getPlayerState(userId);
    const next = { ...state, energy: Math.min(state.maxEnergy, state.energy + Math.max(1, amount)) };
    this.store.savePlayerState(next);
    return next;
  }

  resolveEncounter(userId: string, succeeded: boolean): PlayerWorldState {
    const state = this.getPlayerState(userId);
    const encounter = state.activeEncounter;
    if (!encounter) throw new ValidationError(["no active encounter"]);

    const payout: RewardBundle = succeeded ? encounter.reward : { xp: 0, perbug: 0, resources: {}, energy: 0 };
    const nextInventory = { ...state.progression.inventory };
    for (const [key, value] of Object.entries(payout.resources)) {
      nextInventory[key] = (nextInventory[key] ?? 0) + value;
    }
    const nextXp = state.progression.xp + payout.xp;

    const next: PlayerWorldState = {
      ...state,
      energy: Math.min(state.maxEnergy, state.energy + payout.energy),
      progression: {
        level: 1 + Math.floor(nextXp / 120),
        xp: nextXp,
        perbug: state.progression.perbug + payout.perbug,
        inventory: nextInventory
      },
      activeEncounter: { ...encounter, status: succeeded ? "resolved" : "failed" }
    };

    this.store.savePlayerState(next);
    return next;
  }

  private getPlayerState(userId: string): PlayerWorldState {
    const state = this.store.getPlayerState(userId);
    if (!state) throw new ValidationError(["player state not initialized"]);
    return state;
  }

  private createEncounter(node: PerbugNode): NodeEncounter {
    return {
      id: `enc-${node.id}-${Date.now()}`,
      nodeId: node.id,
      type: encounterTypeForNode(node.nodeType),
      status: "ready",
      reward: {
        xp: 12 + node.difficulty * 3,
        perbug: node.nodeType === "rare" ? 3 : 1,
        resources: node.nodeType === "resource" ? { bio_dust: 2 + node.difficulty } : { signal_shard: 1 + Math.floor(node.difficulty / 2) },
        energy: node.nodeType === "rest" ? 4 : 1
      }
    };
  }
}

function encounterTypeForNode(type: PerbugNodeType): NodeEncounter["type"] {
  switch (type) {
    case "resource": return "harvest";
    case "rare": return "tactical";
    case "boss": return "boss";
    case "rest": return "timed";
    case "mission": return "mission";
    default: return "puzzle";
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const earthRadius = 6371000;
  const toRad = (degree: number) => degree * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}
