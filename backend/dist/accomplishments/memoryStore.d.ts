import type { AccomplishmentDefinition, UserAccomplishmentState } from "./types.js";
import type { AccomplishmentsStore } from "./store.js";
export declare class MemoryAccomplishmentsStore implements AccomplishmentsStore {
    private readonly definitions;
    private readonly byUser;
    private readonly processed;
    constructor(definitions?: AccomplishmentDefinition[]);
    listDefinitions(): AccomplishmentDefinition[];
    getUserState(userId: string): UserAccomplishmentState | undefined;
    saveUserState(state: UserAccomplishmentState): void;
    hasProcessedEvent(eventId: string): boolean;
    markProcessedEvent(eventId: string): void;
}
