import type { SanitizeOptions } from "./types.js";
export declare function normalizeWhitespace(s: string, allowNewlines: boolean): string;
export declare function truncate(s: string, maxLen: number, ellipsis: boolean): string;
export declare function sanitizeText(raw: unknown, opts: SanitizeOptions): string | undefined;
