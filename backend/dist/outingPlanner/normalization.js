export function normalizeRequest(input) {
    const vibeTags = dedupeLower(input.vibeTags);
    const categoryPreferences = dedupeLower(input.categoryPreferences);
    const exclusions = dedupeLower(input.exclusions);
    return {
        ...input,
        prompt: trimmed(input.prompt),
        city: trimmed(input.city),
        neighborhood: trimmed(input.neighborhood),
        date: trimmed(input.date),
        startTime: trimmed(input.startTime),
        budgetLevel: input.budgetLevel,
        vibeTags,
        categoryPreferences,
        exclusions,
        accessibilityNeeds: dedupeLower(input.accessibilityNeeds),
        durationMinutes: clamp(input.durationMinutes ?? 240, 60, 720),
        partySize: clamp(input.partySize ?? 2, 1, 20)
    };
}
function dedupeLower(values) {
    const seen = new Set();
    const out = [];
    for (const value of values ?? []) {
        const normalized = value.trim().toLowerCase();
        if (!normalized || seen.has(normalized))
            continue;
        seen.add(normalized);
        out.push(normalized);
    }
    return out;
}
function trimmed(value) {
    const normalized = String(value ?? "").trim();
    return normalized || undefined;
}
function clamp(value, min, max) {
    if (!Number.isFinite(value))
        return min;
    return Math.max(min, Math.min(max, Math.round(value)));
}
