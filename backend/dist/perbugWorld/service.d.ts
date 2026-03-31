import { PerbugEncounterRegistry } from "./encounters.js";
import type { EncounterAnalyticsEvent, EncounterResolution, EncounterSession, NodeEncounterView, NodeProgressState, PerbugNode, PerbugWorldStore, PlayerWorldState, ReachableNode } from "./types.js";
export declare class PerbugWorldService {
    private readonly store;
    private readonly registry;
    private readonly resolver;
    constructor(store: PerbugWorldStore, registry?: PerbugEncounterRegistry);
    initializePlayer(userId: string, nodePool: PerbugNode[]): PlayerWorldState;
    computeReachableNodes(state: PlayerWorldState, nodePool: PerbugNode[]): ReachableNode[];
    movePlayer(userId: string, destinationNodeId: string, nodePool: PerbugNode[]): PlayerWorldState;
    previewEncounter(userId: string, nodeId: string, nodePool: PerbugNode[]): NodeEncounterView;
    launchEncounter(userId: string, nodeId: string, nodePool: PerbugNode[]): PlayerWorldState;
    submitEncounterAction(userId: string, resolution: EncounterResolution): PlayerWorldState;
    resolveEncounter(userId: string, succeeded?: boolean): PlayerWorldState;
    finalizeEncounter(userId: string): PlayerWorldState;
    abandonEncounter(userId: string): PlayerWorldState;
    retryEncounter(userId: string): PlayerWorldState;
    claimEnergy(userId: string, amount?: number): {
        energy: number;
        userId: string;
        currentNodeId: string;
        maxEnergy: number;
        movementRangeMeters: number;
        visitedNodeIds: string[];
        movementHistory: Array<{
            fromNodeId: string;
            toNodeId: string;
            energyCost: number;
            happenedAt: string;
        }>;
        progression: import("./types.js").ProgressionState;
        squad: {
            maxSlots: number;
            units: import("./types.js").SquadUnit[];
        };
        activeEncounter?: EncounterSession;
        encounterHistory: EncounterSession[];
        nodeProgress: Record<string, NodeProgressState>;
        analyticsLog: EncounterAnalyticsEvent[];
    };
    private finalizeEncounterWithOutcome;
    private computeEligibility;
    private buildContext;
    private bumpNodeProgress;
    private requireNode;
    private requireNodeFromState;
    private requireNodeByVisited;
    private recordEvent;
    private requireActiveEncounter;
    private getPlayerState;
}
