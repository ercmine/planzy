import { defaultLogger } from "../../logging/logger.js";
import { hashString } from "../../logging/redact.js";
import { ValidationError } from "../../plans/errors.js";
import { readHeader, parseJsonBody, sendJson } from "../../venues/claims/http.js";
class IdeaNotFoundError extends Error {
    constructor() {
        super("idea_not_found");
    }
}
function parseLimit(raw) {
    if (raw === null) {
        return undefined;
    }
    const value = Number.parseInt(raw, 10);
    if (!Number.isInteger(value) || value < 1) {
        throw new ValidationError(["limit must be a positive integer"]);
    }
    return value;
}
function asRecord(value) {
    if (!value || typeof value !== "object") {
        throw new ValidationError(["request body must be an object"]);
    }
    return value;
}
export function parseCreateIdeaBody(body) {
    const payload = asRecord(body);
    return {
        title: payload.title,
        description: payload.description,
        category: payload.category,
        priceLevel: payload.priceLevel,
        website: payload.websiteLink,
        phone: payload.callLink
    };
}
function toListIdeasResponse(sessionId, ideas) {
    return {
        sessionId,
        ideas: ideas.ideas.map((idea) => ({
            ideaId: idea.ideaId,
            title: idea.data.title,
            description: idea.data.description,
            category: idea.data.category,
            priceLevel: idea.data.priceLevel,
            websiteLink: idea.data.website,
            callLink: idea.data.phone,
            createdAtISO: idea.createdAtISO
        })),
        nextCursor: ideas.nextCursor ?? null
    };
}
async function assertIdeaExists(store, sessionId, ideaId) {
    let cursor = null;
    do {
        const result = await store.listIdeas(sessionId, {
            includeDeleted: true,
            limit: 500,
            cursor
        });
        if (result.ideas.some((idea) => idea.ideaId === ideaId)) {
            return;
        }
        cursor = result.nextCursor ?? null;
    } while (cursor);
    throw new IdeaNotFoundError();
}
export function createIdeasHandlers(deps) {
    const logger = deps.logger ?? defaultLogger;
    async function postIdea(req, res, params) {
        const userId = readHeader(req, "x-user-id");
        try {
            const body = await parseJsonBody(req);
            const input = parseCreateIdeaBody(body);
            const created = await deps.ideasStore.addIdea(params.sessionId, input, {
                userId,
                now: new Date()
            });
            logger.info("api.session_idea.created", {
                module: "api.sessions.ideas",
                sessionHash: hashString(params.sessionId),
                ideaId: created.ideaId,
                userHash: userId ? hashString(userId) : undefined,
                titleHash: hashString(created.data.title),
                descriptionHash: created.data.description ? hashString(created.data.description) : undefined
            });
            sendJson(res, 201, {
                ideaId: created.ideaId,
                createdAtISO: created.createdAtISO
            });
        }
        catch (error) {
            if (error instanceof ValidationError) {
                sendJson(res, 400, { error: "validation_error", details: error.details });
                return;
            }
            logger.error("api.session_idea.create_failed", {
                module: "api.sessions.ideas",
                sessionHash: hashString(params.sessionId),
                userHash: userId ? hashString(userId) : undefined,
                error: error instanceof Error ? error.message : "unknown"
            });
            sendJson(res, 500, { error: "internal_error" });
        }
    }
    async function listIdeas(req, res, params) {
        const base = `http://${req.headers.host ?? "localhost"}`;
        const url = new URL(req.url ?? "/", base);
        try {
            const ideas = await deps.ideasStore.listIdeas(params.sessionId, {
                limit: parseLimit(url.searchParams.get("limit")),
                cursor: url.searchParams.get("cursor")
            });
            sendJson(res, 200, toListIdeasResponse(params.sessionId, ideas));
        }
        catch (error) {
            if (error instanceof ValidationError) {
                sendJson(res, 400, { error: "validation_error", details: error.details });
                return;
            }
            logger.error("api.session_idea.list_failed", {
                module: "api.sessions.ideas",
                sessionHash: hashString(params.sessionId),
                error: error instanceof Error ? error.message : "unknown"
            });
            sendJson(res, 500, { error: "internal_error" });
        }
    }
    async function deleteIdea(req, res, params) {
        const userId = readHeader(req, "x-user-id");
        try {
            await assertIdeaExists(deps.ideasStore, params.sessionId, params.ideaId);
            await deps.ideasStore.deleteIdea(params.sessionId, params.ideaId, {
                userId,
                now: new Date()
            });
            logger.info("api.session_idea.deleted", {
                module: "api.sessions.ideas",
                sessionHash: hashString(params.sessionId),
                ideaId: params.ideaId,
                userHash: userId ? hashString(userId) : undefined
            });
            res.statusCode = 204;
            res.end();
        }
        catch (error) {
            if (error instanceof IdeaNotFoundError) {
                sendJson(res, 404, { error: "idea_not_found" });
                return;
            }
            if (error instanceof ValidationError) {
                sendJson(res, 400, { error: "validation_error", details: error.details });
                return;
            }
            logger.error("api.session_idea.delete_failed", {
                module: "api.sessions.ideas",
                sessionHash: hashString(params.sessionId),
                userHash: userId ? hashString(userId) : undefined,
                error: error instanceof Error ? error.message : "unknown"
            });
            sendJson(res, 500, { error: "internal_error" });
        }
    }
    return { postIdea, listIdeas, deleteIdea };
}
