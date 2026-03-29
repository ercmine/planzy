import type { ChallengesStore } from "./store.js";
import type { ChallengeDefinition, UserChallengeState } from "./types.js";
export declare class MemoryChallengesStore implements ChallengesStore {
    private definitions;
    private readonly userStates;
    private readonly processedEvents;
    listDefinitions(): ChallengeDefinition[];
    getDefinition(challengeId: string): ChallengeDefinition | null;
    upsertDefinition(definition: ChallengeDefinition): void;
    getUserState(userId: string): UserChallengeState | null;
    saveUserState(state: UserChallengeState): void;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
}
