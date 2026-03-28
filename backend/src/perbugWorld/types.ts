export type PerbugNodeState = "available" | "completed" | "locked" | "exhausted" | "special" | "future_challenge_ready";
export type PerbugNodeType = "encounter" | "resource" | "mission" | "rest" | "rare" | "boss" | "event" | "support";
export type EncounterType = "puzzle" | "tactical" | "timed" | "harvest" | "boss" | "mission";

export interface PerbugNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  region: string;
  nodeType: PerbugNodeType;
  difficulty: number;
  state: PerbugNodeState;
  energyReward: number;
}

export interface RewardBundle {
  xp: number;
  perbug: number;
  resources: Record<string, number>;
  energy: number;
}

export interface NodeEncounter {
  id: string;
  nodeId: string;
  type: EncounterType;
  status: "ready" | "in_progress" | "resolved" | "failed";
  reward: RewardBundle;
}

export interface SquadUnit {
  id: string;
  name: string;
  power: number;
  rarity: string;
  equipped: boolean;
}

export interface ProgressionState {
  level: number;
  xp: number;
  perbug: number;
  inventory: Record<string, number>;
}

export interface PlayerWorldState {
  userId: string;
  currentNodeId: string;
  energy: number;
  maxEnergy: number;
  movementRangeMeters: number;
  visitedNodeIds: string[];
  movementHistory: Array<{ fromNodeId: string; toNodeId: string; energyCost: number; happenedAt: string }>;
  progression: ProgressionState;
  squad: { maxSlots: number; units: SquadUnit[] };
  activeEncounter?: NodeEncounter;
}

export interface ReachableNode {
  node: PerbugNode;
  distanceMeters: number;
  energyCost: number;
  reachable: boolean;
}

export interface PerbugWorldStore {
  savePlayerState(state: PlayerWorldState): void;
  getPlayerState(userId: string): PlayerWorldState | undefined;
}
