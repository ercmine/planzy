import type { ChallengeDefinition, UserChallengeState } from "./types.js";

export interface ChallengesStore {
  listDefinitions(): ChallengeDefinition[];
  getDefinition(challengeId: string): ChallengeDefinition | null;
  upsertDefinition(definition: ChallengeDefinition): void;
  getUserState(userId: string): UserChallengeState | null;
  saveUserState(state: UserChallengeState): void;
  hasProcessedEvent(eventId: string): boolean;
  markProcessedEvent(eventId: string): void;
}
