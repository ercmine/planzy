import { ValidationError } from "../errors.js";
import { sanitizeText } from "../../sanitize/text.js";
export function validateUserIdeaInput(input) {
    const details = [];
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
export function validateSessionId(sessionId) {
    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
        throw new ValidationError(["sessionId must be a non-empty string"]);
    }
    return sessionId.trim();
}
