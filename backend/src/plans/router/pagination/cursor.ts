import { ValidationError } from "../../errors.js";

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000;
const DEFAULT_MAX_OFFSET = 5_000;
const MAX_BATCH_SIZE = 100;
const MAX_DECK_KEY_LENGTH = 120;

export interface RouterCursorV2 {
  v: 2;
  offset: number;
  batchSize: number;
  deckKey?: string;
  createdAtMs: number;
}

export function encodeBase64Url(str: string): string {
  return Buffer.from(str, "utf8").toString("base64url");
}

export function decodeBase64Url(b64: string): string {
  return Buffer.from(b64, "base64url").toString("utf8");
}

export function encodeCursor(c: RouterCursorV2): string {
  return encodeBase64Url(JSON.stringify(c));
}

function isRouterCursorV2(value: unknown): value is RouterCursorV2 {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<RouterCursorV2>;
  return candidate.v === 2;
}

export function decodeCursor(cursor: string): RouterCursorV2 | null {
  try {
    const parsed = JSON.parse(decodeBase64Url(cursor)) as unknown;
    if (!isRouterCursorV2(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function validateCursor(
  c: RouterCursorV2,
  nowMs: number,
  opts?: { maxAgeMs?: number; maxOffset?: number }
): RouterCursorV2 {
  const details: string[] = [];
  const maxAgeMs = opts?.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
  const maxOffset = opts?.maxOffset ?? DEFAULT_MAX_OFFSET;

  if (c.v !== 2) {
    details.push("cursor version is invalid");
  }

  if (!Number.isInteger(c.offset) || c.offset < 0 || c.offset > maxOffset) {
    details.push(`cursor offset must be an integer between 0 and ${maxOffset}`);
  }

  if (!Number.isInteger(c.batchSize) || c.batchSize < 1 || c.batchSize > MAX_BATCH_SIZE) {
    details.push(`cursor batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`);
  }

  if (!Number.isFinite(c.createdAtMs) || c.createdAtMs <= 0) {
    details.push("cursor createdAtMs must be a positive number");
  } else if (nowMs - c.createdAtMs > maxAgeMs || c.createdAtMs - nowMs > maxAgeMs) {
    details.push("cursor has expired");
  }

  if (c.deckKey !== undefined && (typeof c.deckKey !== "string" || c.deckKey.length > MAX_DECK_KEY_LENGTH)) {
    details.push(`cursor deckKey must be a string up to ${MAX_DECK_KEY_LENGTH} chars`);
  }

  if (details.length > 0) {
    throw new ValidationError(details, "Invalid cursor");
  }

  return c;
}
