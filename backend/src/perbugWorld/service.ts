import { ValidationError } from "../plans/errors.js";
import type { PerbugNode, PerbugWorldStore, PlayerWorldState } from "./types.js";

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
      movementHistory: []
    };
    this.store.savePlayerState(state);
    return state;
  }

  computeReachableNodes(state: PlayerWorldState, nodePool: PerbugNode[]) {
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
    const state = this.store.getPlayerState(userId);
    if (!state) throw new ValidationError(["player state not initialized"]);
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
      ]
    };

    this.store.savePlayerState(next);
    return next;
  }

  claimEnergy(userId: string, amount = 3) {
    const state = this.store.getPlayerState(userId);
    if (!state) throw new ValidationError(["player state not initialized"]);
    const next = { ...state, energy: Math.min(state.maxEnergy, state.energy + Math.max(1, amount)) };
    this.store.savePlayerState(next);
    return next;
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
