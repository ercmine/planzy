import type { PerbugWorldStore, PlayerWorldState } from "./types.js";
export declare class MemoryPerbugWorldStore implements PerbugWorldStore {
    private readonly states;
    savePlayerState(state: PlayerWorldState): void;
    getPlayerState(userId: string): PlayerWorldState | undefined;
}
