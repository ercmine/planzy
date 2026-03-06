import { enforceProfanity, maskProfanity } from "./profanity.js";
import { stripHtml } from "./html.js";
import type { SanitizeOptions } from "./types.js";

export function normalizeWhitespace(s: string, allowNewlines: boolean): string {
  const normalizedLineEndings = s.replace(/\r\n?/g, "\n");

  if (!allowNewlines) {
    return normalizedLineEndings.replace(/\s+/g, " ").trim();
  }

  const lines = normalizedLineEndings.split("\n");
  const collapsedLines = lines.map((line) => line.replace(/[\t ]+/g, " ").trim());

  const result: string[] = [];
  let blankStreak = 0;
  for (const line of collapsedLines) {
    if (line.length === 0) {
      if (blankStreak < 2) {
        result.push("");
      }
      blankStreak += 1;
      continue;
    }
    blankStreak = 0;
    result.push(line);
  }

  return result.join("\n").trim();
}

export function truncate(s: string, maxLen: number, ellipsis: boolean): string {
  if (maxLen <= 0) {
    return "";
  }

  if (s.length <= maxLen) {
    return s;
  }

  if (!ellipsis || maxLen < 2) {
    return s.slice(0, maxLen);
  }

  return `${s.slice(0, maxLen - 1)}…`;
}

export function sanitizeText(raw: unknown, opts: SanitizeOptions): string | undefined {
  if (raw === null || raw === undefined) {
    return undefined;
  }
  if (typeof raw !== "string") {
    return undefined;
  }

  const strip = opts.stripHtml ?? true;
  const allowNewlines = opts.allowNewlines ?? false;
  const collapseWhitespace = opts.collapseWhitespace ?? true;
  const ellipsis = opts.ellipsis ?? true;
  const profanityMode = opts.profanityMode ?? (opts.source === "user" ? "mask" : "none");

  let cleaned = strip ? stripHtml(raw) : raw;
  cleaned = collapseWhitespace ? normalizeWhitespace(cleaned, allowNewlines) : cleaned.trim();

  if (opts.source === "user" && profanityMode !== "none") {
    if (profanityMode === "block") {
      enforceProfanity(cleaned);
    } else {
      const profanity = maskProfanity(cleaned);
      if (profanity.severity === "severe") {
        enforceProfanity(cleaned);
      }
      cleaned = profanity.cleanedText ?? cleaned;
    }
  }

  cleaned = truncate(cleaned, opts.maxLen, ellipsis);
  return cleaned.length > 0 ? cleaned : undefined;
}
