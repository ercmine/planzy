import { ValidationError } from "../plans/errors.js";
// Keep lists small and maintainable; expand cautiously with product/legal review.
const MILD_TERMS = [
    { label: "damn", pattern: /\bdamn\b/gi },
    { label: "hell", pattern: /\bhell\b/gi },
    { label: "crap", pattern: /\bcrap\b/gi },
    { label: "shit", pattern: /\bsh[i1!]t\b/gi },
    { label: "fuck", pattern: /\bf[u*]ck\b/gi }
];
const SEVERE_TERMS = [
    { label: "kill yourself", pattern: /\b(kys|kill\s+yourself)\b/gi },
    { label: "i will kill", pattern: /\bi\s+will\s+kill\b/gi },
    { label: "rape", pattern: /\brape\b/gi },
    { label: "lynch", pattern: /\blynch\b/gi }
];
function collectMatches(input, terms) {
    const matches = new Set();
    for (const term of terms) {
        term.pattern.lastIndex = 0;
        if (term.pattern.test(input)) {
            matches.add(term.label);
        }
    }
    return Array.from(matches);
}
export function checkProfanity(input) {
    const severeMatches = collectMatches(input, SEVERE_TERMS);
    if (severeMatches.length > 0) {
        return {
            hasProfanity: true,
            severity: "severe",
            matched: severeMatches
        };
    }
    const mildMatches = collectMatches(input, MILD_TERMS);
    if (mildMatches.length > 0) {
        return {
            hasProfanity: true,
            severity: "mild",
            matched: mildMatches
        };
    }
    return {
        hasProfanity: false,
        severity: "none",
        matched: []
    };
}
export function maskProfanity(input) {
    const severity = checkProfanity(input);
    if (severity.severity === "severe") {
        return severity;
    }
    if (severity.severity === "none") {
        return { ...severity, cleanedText: input };
    }
    let cleanedText = input;
    for (const term of MILD_TERMS) {
        term.pattern.lastIndex = 0;
        cleanedText = cleanedText.replace(term.pattern, (match) => "*".repeat(match.length));
    }
    return {
        hasProfanity: true,
        severity: "mild",
        matched: severity.matched,
        cleanedText
    };
}
export function enforceProfanity(input) {
    const result = checkProfanity(input);
    if (result.severity === "severe") {
        throw new ValidationError(["Input contains abusive content."], "Input contains abusive content.");
    }
}
