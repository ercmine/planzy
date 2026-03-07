import type { IncomingMessage, ServerResponse } from "node:http";

import { defaultLogger } from "../../logging/logger.js";
import type { Logger } from "../../logging/loggerTypes.js";
import { hashString } from "../../logging/redact.js";
import { ValidationError } from "../../plans/errors.js";
import type { IdeasStore, UserIdeaInput } from "../../plans/bringYourOwn/storage.js";
import { readHeader, parseJsonBody, sendJson } from "../../venues/claims/http.js";
import type { ListIdeasResponse } from "./ideasTypes.js";

class IdeaNotFoundError extends Error {
  constructor() {
    super("idea_not_found");
  }
}

function parseLimit(raw: string | null): number | undefined {
  if (raw === null) {
    return undefined;
  }

  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new ValidationError(["limit must be a positive integer"]);
  }

  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new ValidationError(["request body must be an object"]);
  }

  return value as Record<string, unknown>;
}

export function parseCreateIdeaBody(body: unknown): UserIdeaInput {
  const payload = asRecord(body);

  return {
    title: payload.title as string,
    description: payload.description as string | undefined,
    category: payload.category as UserIdeaInput["category"],
    priceLevel: payload.priceLevel as UserIdeaInput["priceLevel"],
    website: payload.websiteLink as string | undefined,
    phone: payload.callLink as string | undefined
  };
}

function toListIdeasResponse(sessionId: string, ideas: Awaited<ReturnType<IdeasStore["listIdeas"]>>): ListIdeasResponse {
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

async function assertIdeaExists(store: IdeasStore, sessionId: string, ideaId: string): Promise<void> {
  let cursor: string | null = null;

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

export interface SessionIdeasHandlers {
  postIdea(req: IncomingMessage, res: ServerResponse, params: { sessionId: string }): Promise<void>;
  listIdeas(req: IncomingMessage, res: ServerResponse, params: { sessionId: string }): Promise<void>;
  deleteIdea(req: IncomingMessage, res: ServerResponse, params: { sessionId: string; ideaId: string }): Promise<void>;
}

export function createIdeasHandlers(deps: {
  ideasStore: IdeasStore;
  logger?: Logger;
}): SessionIdeasHandlers {
  const logger = deps.logger ?? defaultLogger;

  async function postIdea(req: IncomingMessage, res: ServerResponse, params: { sessionId: string }): Promise<void> {
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
    } catch (error) {
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

  async function listIdeas(req: IncomingMessage, res: ServerResponse, params: { sessionId: string }): Promise<void> {
    const base = `http://${req.headers.host ?? "localhost"}`;
    const url = new URL(req.url ?? "/", base);

    try {
      const ideas = await deps.ideasStore.listIdeas(params.sessionId, {
        limit: parseLimit(url.searchParams.get("limit")),
        cursor: url.searchParams.get("cursor")
      });

      sendJson(res, 200, toListIdeasResponse(params.sessionId, ideas));
    } catch (error) {
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

  async function deleteIdea(req: IncomingMessage, res: ServerResponse, params: { sessionId: string; ideaId: string }): Promise<void> {
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
    } catch (error) {
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
