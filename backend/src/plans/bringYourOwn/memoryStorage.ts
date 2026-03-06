import { randomUUID } from "node:crypto";

import { ValidationError } from "../errors.js";
import type { IdeasStore, ListIdeasOptions, ListIdeasResult, StoredIdea, UserIdeaInput } from "./storage.js";
import { validateSessionId, validateUserIdeaInput } from "./storage.js";

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

function sortIdeas(ideas: StoredIdea[]): StoredIdea[] {
  return [...ideas].sort((a, b) => {
    if (a.createdAtISO === b.createdAtISO) {
      return a.ideaId.localeCompare(b.ideaId);
    }
    return a.createdAtISO.localeCompare(b.createdAtISO);
  });
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64");
}

function decodeCursor(cursor: string | null | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const parsed = Number.parseInt(Buffer.from(cursor, "base64").toString("utf8"), 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    throw new ValidationError(["cursor must be a valid base64 offset"]);
  }
}

function normalizeListOptions(opts?: ListIdeasOptions): Required<Pick<ListIdeasOptions, "includeDeleted" | "limit">> & { cursor: string | null } {
  const includeDeleted = opts?.includeDeleted ?? false;
  const limitCandidate = opts?.limit ?? DEFAULT_LIMIT;

  if (!Number.isInteger(limitCandidate) || limitCandidate < 1) {
    throw new ValidationError(["limit must be a positive integer"]);
  }

  return {
    includeDeleted,
    limit: Math.min(limitCandidate, MAX_LIMIT),
    cursor: opts?.cursor ?? null
  };
}

export class MemoryIdeasStore implements IdeasStore {
  private readonly ideasBySession = new Map<string, StoredIdea[]>();

  public async addIdea(sessionId: string, input: UserIdeaInput, meta?: { userId?: string; now?: Date }): Promise<StoredIdea> {
    const cleanSessionId = validateSessionId(sessionId);
    const validatedInput = validateUserIdeaInput(input);
    const createdAtISO = (meta?.now ?? new Date()).toISOString();

    const storedIdea: StoredIdea = {
      ideaId: randomUUID(),
      sessionId: cleanSessionId,
      createdByUserId: meta?.userId,
      createdAtISO,
      data: validatedInput,
      deletedAtISO: null
    };

    const existingIdeas = this.ideasBySession.get(cleanSessionId) ?? [];
    this.ideasBySession.set(cleanSessionId, sortIdeas([...existingIdeas, storedIdea]));

    return storedIdea;
  }

  public async listIdeas(sessionId: string, opts?: ListIdeasOptions): Promise<ListIdeasResult> {
    const cleanSessionId = validateSessionId(sessionId);
    const normalizedOpts = normalizeListOptions(opts);
    const offset = decodeCursor(normalizedOpts.cursor);

    const allIdeas = sortIdeas(this.ideasBySession.get(cleanSessionId) ?? []);
    const visibleIdeas = normalizedOpts.includeDeleted ? allIdeas : allIdeas.filter((idea) => !idea.deletedAtISO);

    const ideas = visibleIdeas.slice(offset, offset + normalizedOpts.limit);
    const nextOffset = offset + ideas.length;

    return {
      ideas,
      nextCursor: nextOffset < visibleIdeas.length ? encodeCursor(nextOffset) : null
    };
  }

  public async deleteIdea(sessionId: string, ideaId: string, meta?: { userId?: string; now?: Date }): Promise<void> {
    const cleanSessionId = validateSessionId(sessionId);
    if (typeof ideaId !== "string" || ideaId.trim().length === 0) {
      throw new ValidationError(["ideaId must be a non-empty string"]);
    }

    const ideas = this.ideasBySession.get(cleanSessionId);
    if (!ideas) {
      return;
    }

    const deleteAtISO = (meta?.now ?? new Date()).toISOString();
    const updated = ideas.map((idea) => {
      if (idea.ideaId !== ideaId) {
        return idea;
      }
      if (idea.deletedAtISO) {
        return idea;
      }
      return {
        ...idea,
        deletedAtISO: deleteAtISO,
        updatedAtISO: deleteAtISO
      };
    });

    this.ideasBySession.set(cleanSessionId, sortIdeas(updated));
  }
}
