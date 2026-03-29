import type { IncomingMessage, ServerResponse } from "node:http";
import type { Logger } from "../../logging/loggerTypes.js";
import type { IdeasStore, UserIdeaInput } from "../../plans/bringYourOwn/storage.js";
export declare function parseCreateIdeaBody(body: unknown): UserIdeaInput;
export interface SessionIdeasHandlers {
    postIdea(req: IncomingMessage, res: ServerResponse, params: {
        sessionId: string;
    }): Promise<void>;
    listIdeas(req: IncomingMessage, res: ServerResponse, params: {
        sessionId: string;
    }): Promise<void>;
    deleteIdea(req: IncomingMessage, res: ServerResponse, params: {
        sessionId: string;
        ideaId: string;
    }): Promise<void>;
}
export declare function createIdeasHandlers(deps: {
    ideasStore: IdeasStore;
    logger?: Logger;
}): SessionIdeasHandlers;
