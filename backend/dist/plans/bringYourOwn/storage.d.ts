import type { Category, PriceLevel } from "../types.js";
export interface UserIdeaInput {
    title: string;
    description?: string;
    category?: Category;
    priceLevel?: PriceLevel;
    website?: string;
    phone?: string;
}
export interface StoredIdea {
    ideaId: string;
    sessionId: string;
    createdByUserId?: string;
    createdAtISO: string;
    updatedAtISO?: string;
    data: UserIdeaInput;
    deletedAtISO?: string | null;
}
export interface ListIdeasOptions {
    includeDeleted?: boolean;
    limit?: number;
    cursor?: string | null;
}
export interface ListIdeasResult {
    ideas: StoredIdea[];
    nextCursor?: string | null;
}
export interface IdeasStore {
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
export declare function validateUserIdeaInput(input: UserIdeaInput): UserIdeaInput;
export declare function validateSessionId(sessionId: string): string;
