import type { PerbugWorldStore, PlayerWorldState } from "./types.js";

export class MemoryPerbugWorldStore implements PerbugWorldStore {
  private readonly states = new Map<string, PlayerWorldState>();

  savePlayerState(state: PlayerWorldState): void {
    this.states.set(state.userId, cloneState(state));
  }

  getPlayerState(userId: string): PlayerWorldState | undefined {
    const current = this.states.get(userId);
    return current ? cloneState(current) : undefined;
  }
}

function cloneState(state: PlayerWorldState): PlayerWorldState {
  return {
    ...state,
    visitedNodeIds: [...state.visitedNodeIds],
    movementHistory: [...state.movementHistory],
    progression: {
      ...state.progression,
      inventory: { ...state.progression.inventory }
    },
    squad: {
      ...state.squad,
      units: state.squad.units.map((unit) => ({ ...unit }))
    },
    activeEncounter: state.activeEncounter
      ? {
          ...state.activeEncounter,
          reward: {
            ...state.activeEncounter.reward,
            resources: { ...state.activeEncounter.reward.resources }
          }
        }
      : undefined
  };
}
