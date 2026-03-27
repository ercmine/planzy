import type { PerbugWorldStore, PlayerWorldState } from "./types.js";

export class MemoryPerbugWorldStore implements PerbugWorldStore {
  private readonly states = new Map<string, PlayerWorldState>();

  savePlayerState(state: PlayerWorldState): void {
    this.states.set(state.userId, state);
  }

  getPlayerState(userId: string): PlayerWorldState | undefined {
    const current = this.states.get(userId);
    return current ? { ...current, visitedNodeIds: [...current.visitedNodeIds], movementHistory: [...current.movementHistory] } : undefined;
  }
}
