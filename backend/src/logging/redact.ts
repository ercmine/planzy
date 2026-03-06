import { createHash } from "node:crypto";
import { geoCell } from "../plans/cache/geoCell.js";

const SENSITIVE_KEY_PATTERN = /(apiKey|token|authorization|cookie|password)/i;
const TEXT_KEY_PATTERN = /(address|phone|email|contact|name|title|description)/i;
const URL_KEY_PATTERN = /(url|uri|link|website|booking|ticket|maps)/i;
const LAT_KEYS = new Set(["lat", "latitude"]);
const LNG_KEYS = new Set(["lng", "longitude"]);
const MAX_DEPTH = 4;
const MAX_ARRAY_LENGTH = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function stripQuery(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    const noHash = url.split("#", 1)[0] ?? "";
    return noHash.split("?", 1)[0] ?? "";
  }
}

export function coarseGeo(lat: number, lng: number): { cell: string } {
  return { cell: geoCell(lat, lng, 3) };
}

export function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

function looksSensitiveText(input: string): boolean {
  const normalized = input.trim();
  if (normalized.length === 0) {
    return true;
  }

  const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern = /\+?\d[\d\s().-]{6,}\d/;
  const addressPattern = /\b\d{1,6}\s+[A-Z0-9][A-Z0-9\s.,'-]{3,}\b/i;

  return emailPattern.test(normalized) || phonePattern.test(normalized) || addressPattern.test(normalized);
}

export function safeTextHint(input: unknown, maxLen = 40): string | undefined {
  if (typeof input !== "string") {
    return undefined;
  }

  const normalized = input.trim().replace(/\s+/g, " ");
  if (normalized.length === 0 || looksSensitiveText(normalized)) {
    return undefined;
  }

  return normalized.slice(0, maxLen);
}

function redactValue(value: unknown, depth: number, keyHint?: string): unknown {
  if (depth > MAX_DEPTH) {
    return "[TRUNCATED]";
  }

  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (keyHint && URL_KEY_PATTERN.test(keyHint)) {
      return stripQuery(value);
    }
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return stripQuery(value);
    }
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => redactValue(item, depth + 1));
  }

  const out: Record<string, unknown> = {};

  let latValue: number | undefined;
  let lngValue: number | undefined;
  const latKeys: string[] = [];
  const lngKeys: string[] = [];

  for (const [key, child] of Object.entries(value)) {
    if (LAT_KEYS.has(key.toLowerCase())) {
      const parsed = toFiniteNumber(child);
      if (parsed !== undefined) {
        latValue = parsed;
      }
      latKeys.push(key);
      continue;
    }

    if (LNG_KEYS.has(key.toLowerCase())) {
      const parsed = toFiniteNumber(child);
      if (parsed !== undefined) {
        lngValue = parsed;
      }
      lngKeys.push(key);
      continue;
    }

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
      continue;
    }

    if (TEXT_KEY_PATTERN.test(key)) {
      const hint = safeTextHint(child);
      if (hint !== undefined) {
        out[key] = hint;
      } else if (typeof child === "string") {
        out[`${key}Hash`] = hashString(child.trim());
      }
      continue;
    }

    out[key] = redactValue(child, depth + 1, key);
  }

  if (latValue !== undefined && lngValue !== undefined && (latKeys.length > 0 || lngKeys.length > 0)) {
    out.geo = coarseGeo(latValue, lngValue);
  } else {
    for (const latKey of latKeys) {
      out[latKey] = "[REDACTED]";
    }
    for (const lngKey of lngKeys) {
      out[lngKey] = "[REDACTED]";
    }
  }

  return out;
}

export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  try {
    const redacted = redactValue(obj, 0);
    return isRecord(redacted) && !Array.isArray(redacted) ? redacted : {};
  } catch {
    return {};
  }
}
