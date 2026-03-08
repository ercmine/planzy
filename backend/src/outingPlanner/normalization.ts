import type { OutingPlannerRequest } from "./types.js";

export function normalizeRequest(input: OutingPlannerRequest): OutingPlannerRequest {
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

function dedupeLower(values: string[] | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values ?? []) {
    const normalized = value.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function trimmed(value: string | undefined): string | undefined {
  const normalized = String(value ?? "").trim();
  return normalized || undefined;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
