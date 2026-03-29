import { enforceProfanity, maskProfanity } from "./profanity.js";
import { stripHtml } from "./html.js";
export function normalizeWhitespace(s, allowNewlines) {
    const normalizedLineEndings = s.replace(/\r\n?/g, "\n");
    if (!allowNewlines) {
        return normalizedLineEndings.replace(/\s+/g, " ").trim();
    }
    const lines = normalizedLineEndings.split("\n");
    const collapsedLines = lines.map((line) => line.replace(/[\t ]+/g, " ").trim());
    const result = [];
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
export function truncate(s, maxLen, ellipsis) {
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
export function sanitizeText(raw, opts) {
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
        }
        else {
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
