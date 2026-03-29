import type { IdeasStore, ListIdeasOptions, ListIdeasResult, StoredIdea, UserIdeaInput } from "./storage.js";
export declare class MemoryIdeasStore implements IdeasStore {
    private readonly ideasBySession;
    addIdea(sessionId: string, input: UserIdeaInput, meta?: {
        userId?: string;
        now?: Date;
    }): Promise<StoredIdea>;
    listIdeas(sessionId: string, opts?: ListIdeasOptions): Promise<ListIdeasResult>;
    deleteIdea(sessionId: string, ideaId: string, meta?: {
        userId?: string;
        now?: Date;
    }): Promise<void>;
}
