import type { Category, PriceLevel } from "../types.js";
import { ValidationError } from "../errors.js";
import { sanitizeText } from "../../sanitize/text.js";

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
  addIdea(sessionId: string, input: UserIdeaInput, meta?: { userId?: string; now?: Date }): Promise<StoredIdea>;
  listIdeas(sessionId: string, opts?: ListIdeasOptions): Promise<ListIdeasResult>;
  deleteIdea(sessionId: string, ideaId: string, meta?: { userId?: string; now?: Date }): Promise<void>;
}

export function validateUserIdeaInput(input: UserIdeaInput): UserIdeaInput {
  const details: string[] = [];

  if (!input || typeof input !== "object") {
    throw new ValidationError(["input must be an object"]);
  }

  if (typeof input.title !== "string" || input.title.trim().length === 0) {
    details.push("title must be a non-empty string");
  }

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  const title = sanitizeText(input.title, {
    source: "user",
    maxLen: 140,
    allowNewlines: false
  });

  if (!title) {
    throw new ValidationError(["title must be a non-empty string"]);
  }

  return {
    ...input,
    title,
    description: sanitizeText(input.description, {
      source: "user",
      maxLen: 400,
      allowNewlines: true
    }),
    website: input.website?.trim() || undefined,
    phone: input.phone?.trim() || undefined
  };
}

export function validateSessionId(sessionId: string): string {
  if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
    throw new ValidationError(["sessionId must be a non-empty string"]);
  }

  return sessionId.trim();
}
