export type PerbugNodeState = "available" | "completed" | "locked" | "exhausted" | "special" | "future_challenge_ready";

export interface PerbugNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  region: string;
  state: PerbugNodeState;
  energyReward: number;
}

export interface PlayerWorldState {
  userId: string;
  currentNodeId: string;
  energy: number;
  maxEnergy: number;
  movementRangeMeters: number;
  visitedNodeIds: string[];
  movementHistory: Array<{ fromNodeId: string; toNodeId: string; energyCost: number; happenedAt: string }>;
}

export interface PerbugWorldStore {
  savePlayerState(state: PlayerWorldState): void;
  getPlayerState(userId: string): PlayerWorldState | undefined;
}
