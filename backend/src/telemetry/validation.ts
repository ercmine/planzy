import { ValidationError } from "../plans/errors.js";
import type {
  CardOpenedEvent,
  CardViewedEvent,
  DeckLoadedEvent,
  OutboundLinkClickedEvent,
  SwipeAction,
  SwipeEvent,
  TelemetryEventInput,
  TelemetryEventName
} from "./types.js";

const EVENT_NAMES: TelemetryEventName[] = ["deck_loaded", "card_viewed", "card_opened", "swipe", "outbound_link_clicked"];
const SWIPE_ACTIONS: SwipeAction[] = ["yes", "no", "maybe"];
const LINK_TYPES: OutboundLinkClickedEvent["linkType"][] = ["maps", "website", "call", "booking", "ticket"];
const CARD_OPENED_SECTIONS: NonNullable<CardOpenedEvent["section"]>[] = ["details", "links", "photos"];
const BASE_KEYS = ["event", "sessionId", "planId", "clientAtISO", "deckKey", "cursor", "position", "source"] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoPii(value: unknown, path = "root"): void {
  if (typeof value === "string") {
    if (value.toLowerCase().startsWith("http")) {
      throw new ValidationError([`PII-unsafe URL-like value at ${path}`]);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPii(item, `${path}[${index}]`));
    return;
  }

  if (!isObject(value)) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    if (key.toLowerCase().includes("url")) {
      throw new ValidationError([`PII-unsafe key '${key}' is not allowed`]);
    }
    assertNoPii(nested, `${path}.${key}`);
  }
}

function allowKeys(input: Record<string, unknown>, allowed: readonly string[]): void {
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      throw new ValidationError([`unknown field '${key}'`]);
    }
  }
}

function readString(input: Record<string, unknown>, field: string, required = false): string | undefined {
  const raw = input[field];
  if (raw === undefined) {
    if (required) throw new ValidationError([`${field} must be a non-empty string`]);
    return undefined;
  }
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new ValidationError([`${field} must be a non-empty string`]);
  }
  return raw.trim();
}

function readInteger(input: Record<string, unknown>, field: string, min: number, max: number, required = false): number | undefined {
  const raw = input[field];
  if (raw === undefined) {
    if (required) throw new ValidationError([`${field} is required`]);
    return undefined;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < min || raw > max) {
    throw new ValidationError([`${field} must be an integer between ${min} and ${max}`]);
  }
  return raw;
}

function readOptionalISO(input: Record<string, unknown>): string | undefined {
  const raw = input.clientAtISO;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string" || Number.isNaN(Date.parse(raw))) {
    throw new ValidationError(["clientAtISO must be a parseable ISO date string"]);
  }
  return raw;
}

function readBase<E extends TelemetryEventName>(input: Record<string, unknown>, sessionIdFromPath: string, event: E): {
  event: E;
  sessionId: string;
  clientAtISO?: string;
  deckKey?: string;
  cursor?: string | null;
  position?: number;
  source?: string;
} {
  const sessionId = sessionIdFromPath.trim();
  if (!sessionId) {
    throw new ValidationError(["sessionId must be a non-empty string"]);
  }

  const deckKey = input.deckKey;
  if (deckKey !== undefined && typeof deckKey !== "string") {
    throw new ValidationError(["deckKey must be a string"]);
  }

  const source = input.source;
  if (source !== undefined && typeof source !== "string") {
    throw new ValidationError(["source must be a string"]);
  }

  const cursor = input.cursor;
  if (cursor !== undefined && cursor !== null && typeof cursor !== "string") {
    throw new ValidationError(["cursor must be string or null"]);
  }

  const position = readInteger(input, "position", 0, 500, false);
  const clientAtISO = readOptionalISO(input);

  return {
    event,
    sessionId,
    ...(clientAtISO !== undefined ? { clientAtISO } : {}),
    ...(typeof deckKey === "string" ? { deckKey } : {}),
    ...(cursor !== undefined ? { cursor: cursor as string | null } : {}),
    ...(position !== undefined ? { position } : {}),
    ...(typeof source === "string" ? { source } : {})
  };
}

export function validateTelemetryEventInput(x: unknown, sessionIdFromPath: string): TelemetryEventInput {
  if (!isObject(x)) {
    throw new ValidationError(["telemetry event must be an object"]);
  }

  assertNoPii(x);

  const rawEvent = x.event;
  if (typeof rawEvent !== "string" || !EVENT_NAMES.includes(rawEvent as TelemetryEventName)) {
    throw new ValidationError(["event must be one of: deck_loaded, card_viewed, card_opened, swipe, outbound_link_clicked"]);
  }

  if (rawEvent === "deck_loaded") {
    allowKeys(x, [...BASE_KEYS, "batchSize", "returned", "nextCursorPresent", "planSourceCounts"]);
    const batchSize = readInteger(x, "batchSize", 0, 200, true) as number;
    const returned = readInteger(x, "returned", 0, 200, true) as number;
    if (typeof x.nextCursorPresent !== "boolean") {
      throw new ValidationError(["nextCursorPresent must be a boolean"]);
    }

    let planSourceCounts: Record<string, number> | undefined;
    if (x.planSourceCounts !== undefined) {
      if (!isObject(x.planSourceCounts)) {
        throw new ValidationError(["planSourceCounts must be an object"]);
      }
      planSourceCounts = {};
      for (const [key, value] of Object.entries(x.planSourceCounts)) {
        if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 200) {
          throw new ValidationError(["planSourceCounts values must be integers between 0 and 200"]);
        }
        planSourceCounts[key] = value;
      }
    }

    const event: DeckLoadedEvent = {
      ...readBase(x, sessionIdFromPath, "deck_loaded"),
      batchSize,
      returned,
      nextCursorPresent: x.nextCursorPresent,
      ...(planSourceCounts ? { planSourceCounts } : {})
    };
    return event;
  }

  const planId = readString(x, "planId", true) as string;

  if (rawEvent === "card_viewed") {
    allowKeys(x, [...BASE_KEYS, "viewMs"]);
    const viewMs = readInteger(x, "viewMs", 0, 600000, false);
    const event: CardViewedEvent = {
      ...readBase(x, sessionIdFromPath, "card_viewed"),
      planId,
      ...(viewMs !== undefined ? { viewMs } : {})
    };
    return event;
  }

  if (rawEvent === "card_opened") {
    allowKeys(x, [...BASE_KEYS, "section"]);
    if (x.section !== undefined && (typeof x.section !== "string" || !CARD_OPENED_SECTIONS.includes(x.section as NonNullable<CardOpenedEvent["section"]>))) {
      throw new ValidationError(["section must be one of: details, links, photos"]);
    }
    const event: CardOpenedEvent = {
      ...readBase(x, sessionIdFromPath, "card_opened"),
      planId,
      ...(typeof x.section === "string" ? { section: x.section as NonNullable<CardOpenedEvent["section"]> } : {})
    };
    return event;
  }

  if (rawEvent === "swipe") {
    allowKeys(x, [...BASE_KEYS, "action"]);
    if (typeof x.action !== "string" || !SWIPE_ACTIONS.includes(x.action as SwipeAction)) {
      throw new ValidationError(["action must be one of: yes, no, maybe"]);
    }
    const event: SwipeEvent = {
      ...readBase(x, sessionIdFromPath, "swipe"),
      planId,
      action: x.action as SwipeAction
    };
    return event;
  }

  allowKeys(x, [...BASE_KEYS, "linkType", "affiliate"]);
  if (typeof x.linkType !== "string" || !LINK_TYPES.includes(x.linkType as OutboundLinkClickedEvent["linkType"])) {
    throw new ValidationError(["linkType must be one of: maps, website, call, booking, ticket"]);
  }
  if (x.affiliate !== undefined && typeof x.affiliate !== "boolean") {
    throw new ValidationError(["affiliate must be a boolean"]);
  }

  const outbound: OutboundLinkClickedEvent = {
    ...readBase(x, sessionIdFromPath, "outbound_link_clicked"),
    planId,
    linkType: x.linkType as OutboundLinkClickedEvent["linkType"],
    ...(x.affiliate !== undefined ? { affiliate: x.affiliate } : {})
  };

  return outbound;
}

export function validateTelemetryBatch(x: unknown, sessionIdFromPath: string): TelemetryEventInput[] {
  if (!Array.isArray(x)) {
    throw new ValidationError(["events must be an array"]);
  }
  return x.map((item) => validateTelemetryEventInput(item, sessionIdFromPath));
}
