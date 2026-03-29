export type TextSource = "provider" | "user";
export interface SanitizeOptions {
    source: TextSource;
    maxLen: number;
    allowNewlines?: boolean;
    collapseWhitespace?: boolean;
    stripHtml?: boolean;
    ellipsis?: boolean;
    profanityMode?: "none" | "mask" | "block";
}
export interface ProfanityResult {
    hasProfanity: boolean;
    severity: "none" | "mild" | "severe";
    matched?: string[];
    cleanedText?: string;
}
