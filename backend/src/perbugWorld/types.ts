export type PerbugNodeState = "available" | "completed" | "locked" | "exhausted" | "special" | "future_challenge_ready";
export type PerbugNodeType = "encounter" | "resource" | "mission" | "rest" | "rare" | "boss" | "event" | "support";

export type EncounterType = "puzzle" | "combat" | "mission" | "anomaly" | "treasure" | "boss" | "event" | "tactical";
export type EncounterState = "available" | "launching" | "active" | "paused" | "completed" | "failed" | "abandoned" | "rewarded" | "locked";
export type EncounterFailureReason = "rules_failed" | "timeout" | "abandoned" | "validation_failed" | "ineligible";

export interface PerbugNode {
  id: string;
  label: string;
  lat: number;
  lng: number;
  region: string;
  biome?: string;
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary";
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
  unlocks?: string[];
  missionProgress?: Record<string, number>;
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
  completedNodeIds: string[];
  missionProgress: Record<string, number>;
  unlocks: string[];
}

export interface EncounterEligibility {
  eligible: boolean;
  reasons: string[];
}

export interface EncounterContext {
  userId: string;
  node: PerbugNode;
  progression: ProgressionState;
  squad: { maxSlots: number; units: SquadUnit[] };
  retryCount: number;
}

export interface EncounterLaunchPayload {
  nodeId: string;
  encounterType: EncounterType;
  nodeType: PerbugNodeType;
  biome?: string;
  rarity?: PerbugNode["rarity"];
  difficulty: number;
}

export interface EncounterSession {
  id: string;
  nodeId: string;
  type: EncounterType;
  state: EncounterState;
  launchedAt: string;
  updatedAt: string;
  completedAt?: string;
  retryCount: number;
  moduleState: Record<string, unknown>;
  contextSnapshot: {
    squadPower: number;
    squadSize: number;
    playerLevel: number;
  };
  rewardPreview: RewardBundle;
  rewardGranted: boolean;
  failureReason?: EncounterFailureReason;
  debug: {
    selectionReason: string;
    payload: EncounterLaunchPayload;
    transitions: Array<{ from: EncounterState; to: EncounterState; at: string; reason: string }>;
  };
}

export interface EncounterOutcome {
  succeeded: boolean;
  state: EncounterState;
  failureReason?: EncounterFailureReason;
  resolution: EncounterResolution;
}

export interface EncounterResolution {
  actionId: string;
  summary: string;
  score?: number;
  metadata?: Record<string, unknown>;
}

export interface NodeEncounterView {
  type: EncounterType;
  state: EncounterState;
  preview: {
    title: string;
    description: string;
    risk: "low" | "medium" | "high";
    rewardHint: string;
  };
  payload: EncounterLaunchPayload;
  eligibility: EncounterEligibility;
}

export interface EncounterAnalyticsEvent {
  id: string;
  userId: string;
  nodeId: string;
  encounterId: string;
  eventType: "generated" | "launched" | "action" | "completed" | "failed" | "abandoned" | "retried" | "rewarded";
  encounterType: EncounterType;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export interface NodeProgressState {
  nodeId: string;
  completionState: "unseen" | "in_progress" | "completed" | "failed";
  lastEncounterId?: string;
  attempts: number;
  completedAt?: string;
  failedAt?: string;
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
  activeEncounter?: EncounterSession;
  encounterHistory: EncounterSession[];
  nodeProgress: Record<string, NodeProgressState>;
  analyticsLog: EncounterAnalyticsEvent[];
}

export interface ReachableNode {
  node: PerbugNode;
  distanceMeters: number;
  energyCost: number;
  reachable: boolean;
}

export interface EncounterModule {
  type: EncounterType;
  buildPreview(context: EncounterContext): NodeEncounterView["preview"];
  buildInitialState(context: EncounterContext): Record<string, unknown>;
  evaluate(context: EncounterContext, session: EncounterSession, resolution: EncounterResolution): EncounterOutcome;
  buildReward(context: EncounterContext, outcome: EncounterOutcome): RewardBundle;
}

export interface EncounterResolver {
  resolveType(context: EncounterContext): { type: EncounterType; reason: string };
}

export interface PerbugWorldStore {
  savePlayerState(state: PlayerWorldState): void;
  getPlayerState(userId: string): PlayerWorldState | undefined;
}
