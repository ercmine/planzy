import type { AccomplishmentDefinition, UserAccomplishmentState } from "./types.js";
export interface AccomplishmentsStore {
    listDefinitions(): AccomplishmentDefinition[];
    getUserState(userId: string): UserAccomplishmentState | undefined;
    saveUserState(state: UserAccomplishmentState): void;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
}
