import type { PriceLevel } from "../plan.js";

function clampPriceLevel(value: number): PriceLevel {
  const clamped = Math.min(4, Math.max(0, Math.round(value)));
  return clamped as PriceLevel;
}

export function priceHintToLevel(hint?: string | null): PriceLevel | undefined {
  if (!hint) {
    return undefined;
  }

  const normalized = hint.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (["free", "no cost"].includes(normalized)) {
    return 0;
  }
  if (["cheap", "budget", "inexpensive", "low"].includes(normalized)) {
    return 1;
  }
  if (["moderate", "mid", "medium"].includes(normalized)) {
    return 2;
  }
  if (["expensive", "high", "premium"].includes(normalized)) {
    return 3;
  }
  if (["luxury", "very expensive"].includes(normalized)) {
    return 4;
  }

  return undefined;
}

export function normalizePriceLevel(input: unknown): PriceLevel | undefined {
  if (input === null || input === undefined) {
    return undefined;
  }

  if (typeof input === "number" && Number.isFinite(input)) {
    return clampPriceLevel(input);
  }

  if (typeof input !== "string") {
    return undefined;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const dollars = trimmed.match(/^\$+$/u);
  if (dollars) {
    return clampPriceLevel(dollars[0].length);
  }

  const googleLike: Record<string, PriceLevel> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  if (trimmed in googleLike) {
    return googleLike[trimmed];
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return clampPriceLevel(numeric);
  }

  return priceHintToLevel(trimmed);
}
